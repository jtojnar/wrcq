use {
    super::{
        QualifyingEvents,
        registry::{Person, PersonId},
    },
    crate::{events::EventWithSlug, results::Team},
    chrono::{Months, NaiveDate},
    core::range::RangeInclusive,
    std::collections::BTreeSet,
};

/// Tracks participation in events relevant to pre-qualification criteria.
pub struct ParticipationBag<'a> {
    qualifying_events: &'a QualifyingEvents,
    two_years_preceding_the_opening_of_entries: RangeInclusive<NaiveDate>,

    /// Competed in any 24-hour rogaine in the past two years.
    ///
    /// Used by criterion 2.1.
    pub any_24_hour_rogaine_in_past_two_years: BTreeSet<PersonId>,

    /// Competed in one of the two WRCs preceding the opening of the entries.
    ///
    /// Used by criteria 1.1 and 2.1.
    pub last_two_wrc_unlimited: BTreeSet<PersonId>,
}

impl<'a> ParticipationBag<'a> {
    #[must_use]
    pub fn new(qualifying_events: &'a QualifyingEvents, entries_opening: NaiveDate) -> Self {
        Self {
            qualifying_events,
            two_years_preceding_the_opening_of_entries: RangeInclusive {
                start: entries_opening
                    .checked_sub_months(Months::new(2 * 12))
                    .expect("typoe start out of range"),
                last: entries_opening.pred_opt().expect("typoe end out of range"),
            },
            any_24_hour_rogaine_in_past_two_years: BTreeSet::default(),
            last_two_wrc_unlimited: BTreeSet::default(),
        }
    }

    pub fn participated(&mut self, event: &EventWithSlug, team: &Team) {
        if !team.duration.is_24_hour() {
            return;
        }

        if self
            .qualifying_events
            .last_two_wrcs_unlimited
            .contains(&event.slug)
        {
            team.members.iter().for_each(|member| {
                self.last_two_wrc_unlimited
                    .insert(Person::from(member).id());
            });
        }

        if self
            .two_years_preceding_the_opening_of_entries
            .contains(&event.end)
        {
            team.members.iter().for_each(|member| {
                self.any_24_hour_rogaine_in_past_two_years
                    .insert(Person::from(member).id());
            });
        }
    }
}
