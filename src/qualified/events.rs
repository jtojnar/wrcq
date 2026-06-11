use {
    crate::{
        config::Config,
        events::{EventWithSlug, Level},
    },
    chrono::NaiveDate,
    std::cmp::Reverse,
};

type Slug = String;

/// Holds knowledge about event relevant to pre-qualification criteria.
///
/// Note that events generally must not be conducted prior to [`Config::statute_of_limitations`] to be considered for prequalification.
pub struct QualifyingEvents {
    /// The last two WRCs without statute of limitation, for criteria 1.1 and 2.1.
    pub(super) last_two_wrcs_unlimited: Vec<Slug>,

    /// The last two World Rogaining Championships, for criterion 1.2a.
    pub(super) last_two_wrcs: Vec<Slug>,

    /// The last two European Rogaining Championships, for criterion 1.2b.
    pub(super) last_two_ercs: Vec<Slug>,

    /// The last two North American Rogaining Championships, for criterion 1.2c.
    pub(super) last_two_narcs: Vec<Slug>,

    /// The last two Australasian Rogaining Championships, for criterion 1.2d.
    pub(super) last_two_arcs: Vec<Slug>,

    /// The last two Australasian Rogaining Championships, for criterion 1.2d.
    pub(super) last_two_of_each_nationals: Vec<Slug>,
}

impl QualifyingEvents {
    #[must_use]
    pub fn new(entries_opening: NaiveDate, config: &Config, events: &[EventWithSlug]) -> Self {
        let Config {
            statute_of_limitations,
            ..
        } = *config;

        let mut events = events.to_vec();
        events.sort_by_key(|event| Reverse(event.end));

        let last_n_events = |max_count, level| {
            events
                .iter()
                .filter(|event| {
                    event.level == level
                        && event.end < entries_opening
                        && event.end > statute_of_limitations
                })
                .take(max_count)
                .map(|event| event.slug.clone())
                .collect()
        };

        let last_n_events_for_each_level = |max_count, levels: &[Level]| {
            levels
                .iter()
                .flat_map(|&level| last_n_events(max_count, level))
                .collect()
        };

        let last_two_wrcs_unlimited = events
            .iter()
            .filter(|event| event.level.is_wrc() && event.end < entries_opening)
            .take(2)
            .map(|event| event.slug.clone())
            .collect();

        let last_two_wrcs = last_n_events(2, Level::World);

        let last_two_ercs = last_n_events(2, Level::RegionalE);

        let last_two_narcs = last_n_events(2, Level::RegionalNa);

        let last_two_arcs = last_n_events(2, Level::RegionalA);

        let last_two_of_each_nationals = last_n_events_for_each_level(2, Level::all_nationals());

        Self {
            last_two_wrcs_unlimited,
            last_two_wrcs,
            last_two_ercs,
            last_two_narcs,
            last_two_arcs,
            last_two_of_each_nationals,
        }
    }
}
