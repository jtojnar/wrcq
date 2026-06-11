//! Tools for collecting the list of pre-qualified entrants.

pub use self::{
    councillors::collect_irf_councillors,
    events::QualifyingEvents,
    participation::ParticipationBag,
    registry::{Qualified, Reason, UnresolvedQualification},
};
use {
    self::registry::{Criterion, Person},
    crate::{
        events::EventWithSlug,
        results::{Category, Member, Rankings, TeamWithRanking},
    },
    std::{collections::HashMap, iter::repeat},
};

mod councillors;
mod events;
mod participation;
mod registry;

/// Generally, no more than half of the teams in each a category in any prequalifying event (rounded up) can be pre-qualified.
const CATEGORY_MAX_PERCENTAGE_PREQUALIFIED: f32 = 0.5;

/// Criteria 2.1 and 2.2 have a narrower threshold.
const CATEGORY_MAX_PERCENTAGE_PREQUALIFIED_NARROW: f32 = 0.3;

pub fn collect_qualifications(
    qualifying_events: &QualifyingEvents,
    qualified: &mut Qualified<UnresolvedQualification>,
    results: &[&TeamWithRanking],
    counters: &Rankings,
    event: &EventWithSlug,
) {
    let mut context = Context::new(qualified, results, counters, event);

    context.collect_1_1();

    // Per criterion 1.2a, collects members of top six teams in each category from the two most recent WRCs.
    context.collect_1_2_and_1_3(
        Criterion::OneTwoA,
        Category::all(),
        &qualifying_events.last_two_wrcs,
        6,
    );

    // Per criterion 1.2b, collects members of top three teams in each category from the two most recent ERCs.
    context.collect_1_2_and_1_3(
        Criterion::OneTwoB,
        Category::all(),
        &qualifying_events.last_two_ercs,
        3,
    );

    // Per criterion 1.2c, collects members of top two teams in each category from the two most recent NARCs.
    context.collect_1_2_and_1_3(
        Criterion::OneTwoC,
        Category::all(),
        &qualifying_events.last_two_narcs,
        2,
    );

    // Per criterion 1.2d, collects members of top two teams in each category from the two most recent ARCs.
    context.collect_1_2_and_1_3(
        Criterion::OneTwoD,
        Category::all(),
        &qualifying_events.last_two_arcs,
        2,
    );

    // Per criterion 1.3, collects members of top two teams in each open category from the two most recent each national championship.
    context.collect_1_2_and_1_3(
        Criterion::OneThree,
        Category::all_open(),
        &qualifying_events.last_two_of_each_nationals,
        2,
    );

    // Criterion 1.4 not relevant to events so collected elsewhere.

    context.collect_2_1();

    // Per criterion 2.2, collects members of the remaining four teams in top ten in each category from the two most recent WRCs (follows criterion 1.2a).
    context.collect_2_2_through_4(
        Criterion::TwoTwo,
        &context.max_prequalified_narrow.clone(),
        &qualifying_events.last_two_wrcs,
        7,
        10,
    );

    // Per criterion 2.3, collects members of the remaining two teams in top five in each category from the two most recent ERCs (follows criterion 1.2b).
    context.collect_2_2_through_4(
        Criterion::TwoThree,
        &context.max_prequalified_narrow.clone(),
        &qualifying_events.last_two_ercs,
        4,
        5,
    );

    // Per criterion 2.4b, collects members of the remaining one team in top three in each category from the two most recent NARCs (follows criterion 1.2c).
    context.collect_2_2_through_4(
        Criterion::TwoFourA,
        // TODO: This should probably be not-narrow like 2.4b after b46e2e36e860499db5d5ca39f24f81ee4922a7d1.
        &context.max_prequalified_narrow.clone(),
        &qualifying_events.last_two_narcs,
        3,
        3,
    );

    // Per criterion 2.4b, collects members of the remaining one team in top three in each category from the two most recent ARCs (follows criterion 1.2d).
    context.collect_2_2_through_4(
        Criterion::TwoFourB,
        // TODO: this should use 50% threshold
        &context
            .max_prequalified
            .keys()
            .map(|category| (*category, u32::MAX))
            .collect(),
        &qualifying_events.last_two_arcs,
        3,
        3,
    );
}

struct Context<'a> {
    qualified: &'a mut Qualified<UnresolvedQualification>,
    results: &'a [&'a TeamWithRanking],
    event: &'a EventWithSlug,

    /// Maximum number of pre-qualified teams (automatic and preferred status combined) per each category.
    max_prequalified: HashMap<Category, u32>,

    /// Maximum number of pre-qualified teams (automatic and preferred status combined) per each category through criteria 2.1 and 2.2.
    ///
    /// This is narrower than `max_prequalified`, possibly to avoid having significant fraction of small categories pre-qualified.
    max_prequalified_narrow: HashMap<Category, u32>,
}

impl<'a> Context<'a> {
    fn new(
        qualified: &'a mut Qualified<UnresolvedQualification>,
        results: &'a [&'a TeamWithRanking],
        counters: &'a Rankings,
        event: &'a EventWithSlug,
    ) -> Self {
        let counters = counters.counts_for_24h();
        let max_prequalified = counters
            .clone()
            .into_iter()
            .map(|(category, count)| {
                (
                    category,
                    (CATEGORY_MAX_PERCENTAGE_PREQUALIFIED * count as f32).ceil() as u32,
                )
            })
            .collect();

        let max_prequalified_narrow = counters
            .into_iter()
            .map(|(category, count)| {
                (
                    category,
                    (CATEGORY_MAX_PERCENTAGE_PREQUALIFIED_NARROW * count as f32).ceil() as u32,
                )
            })
            .collect();

        Context {
            qualified,
            results,
            event,
            max_prequalified,
            max_prequalified_narrow,
        }
    }
}

impl Context<'_> {
    /// Per criterion 1.1, collects active champions from all past WRCs.
    ///
    /// Every active member of a team winning the first place in one of the open categories will automatically qualify.
    ///
    /// There is no statute of limitations concerning the champion placing itself but the person must have participated in either of the two most recent WRCs to be considered active.
    fn collect_1_1(&mut self) {
        if !self.event.level.is_wrc() {
            return;
        }

        find_top_n_in_categories(
            self.results,
            &self.max_prequalified,
            Category::all_open(),
            1,
        )
        .for_each(|(member, category, place)| {
            let person = Person::from(member);

            self.qualified.push_ranked_full(
                Criterion::OneOne,
                self.event,
                category,
                place,
                person,
                |_, _| false,
                |participation_bag, person| {
                    participation_bag
                        .last_two_wrc_unlimited
                        .contains(&person.id())
                },
            );
        });
    }

    /// Per criteria 1.2 and 1.3, collects members of top `max_place` teams (but at most half) in each of `categories` from the `qualifying_events`.
    fn collect_1_2_and_1_3(
        &mut self,
        criterion: Criterion,
        categories: &[Category],
        qualifying_events: &[String],
        max_place: u32,
    ) {
        if !qualifying_events.contains(&self.event.slug) {
            return;
        }

        find_top_n_in_categories(self.results, &self.max_prequalified, categories, max_place)
            .for_each(|(member, category, place)| {
                self.qualified
                    .push_ranked(criterion, self.event, category, place, member.into());
            });
    }

    /// Per criterion 2.1, collects non-WRC-active champions from all past WRCs.
    ///
    /// Every non-WRC-active member of a team winning the first place in one of the open categories will automatically qualify.
    ///
    /// There is no statute of limitations concerning the champion placing itself but the person must have participated in at least one 24-hour rogaine in the last two years and must not have participated in either of the two most recent WRCs (those are handled by criterion 1.1) to be considered non-WRC-active.
    fn collect_2_1(&mut self) {
        if !self.event.level.is_wrc() {
            return;
        }

        find_top_n_in_categories(
            self.results,
            &self.max_prequalified,
            Category::all_open(),
            1,
        )
        .for_each(|(member, category, place)| {
            let person = Person::from(member);

            self.qualified.push_ranked_full(
                Criterion::TwoOne,
                self.event,
                category,
                place,
                person,
                |participation_bag, person| {
                    !participation_bag
                        .any_24_hour_rogaine_in_past_two_years
                        .contains(&person.id())
                },
                |participation_bag, person| {
                    !participation_bag
                        .last_two_wrc_unlimited
                        .contains(&person.id())
                },
            );
        });
    }

    /// Per criteria 2.2 through 4, collects members of the remaining `max_place - min_place` teams in top `max_place` (but at most `max_prequalified[category]`) in each category from the `qualifying_events`.
    fn collect_2_2_through_4(
        &mut self,
        criterion: Criterion,
        max_prequalified: &HashMap<Category, u32>,
        qualifying_events: &[String],
        min_place: u32,
        max_place: u32,
    ) {
        if !qualifying_events.contains(&self.event.slug) {
            return;
        }

        find_range_in_categories(
            self.results,
            max_prequalified,
            Category::all(),
            min_place,
            max_place,
        )
        .for_each(|(member, category, place)| {
            self.qualified
                .push_ranked(criterion, self.event, category, place, member.into());
        });
    }
}

/// Returns members of top `max_place` teams (but at most `max_prequalified[category]`) in each of `categories`.
fn find_top_n_in_categories<'a>(
    results: &'a [&'a TeamWithRanking],
    max_prequalified: &HashMap<Category, u32>,
    categories: &'a [Category],
    max_place: u32,
) -> impl Iterator<Item = (&'a Member, Category, u32)> {
    find_range_in_categories(results, max_prequalified, categories, 1, max_place)
}

/// Returns members of teams ranked `min_place` and `max_place` (inclusive, but at most `max_prequalified[category]`) in each of `categories`.
fn find_range_in_categories<'a>(
    results: &'a [&'a TeamWithRanking],
    max_prequalified: &HashMap<Category, u32>,
    categories: &'a [Category],
    min_place: u32,
    max_place: u32,
) -> impl Iterator<Item = (&'a Member, Category, u32)> {
    results
        .iter()
        .flat_map(move |team| {
            categories.iter().filter_map(move |category| {
                team.ranking.categories.get(category).and_then(|place| {
                    (min_place..=Ord::min(max_place, max_prequalified[category]))
                        .contains(place)
                        .then_some((team, category, place))
                })
            })
        })
        .flat_map(|(team, category, place)| team.members.iter().zip(repeat((category, place))))
        .map(|(members, (category, place))| (members, *category, *place))
}
