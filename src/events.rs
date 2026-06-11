//! Loads events (from `content/events/*.toml`).

use {
    crate::toml_datetime_parser::deserialize_toml_date,
    anyhow::anyhow,
    chrono::NaiveDate,
    serde::{Deserialize, Serialize},
    std::{cmp::Reverse, collections::HashMap, path::Path},
    url::Url,
};

#[derive(Clone, Copy, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Level {
    /// Australia (ARC)
    NationalA,

    /// Czech (CRC)
    NationalC,

    /// Finland (FRC)
    NationalF,

    /// Latvia (LVRC)
    NationalLv,

    /// New Zealand (NZRC)
    NationalNz,

    /// Russia (RRC)
    NationalR,

    /// Ukraine (UKRC)
    NationalUk,

    /// United States (USRC)
    NationalUs,

    /// Australia and Asia (AURC)
    RegionalA,

    /// Europe (ERC)
    RegionalE,

    /// Northern America (NARC)
    RegionalNa,

    /// World (WRC)
    World,
}

impl Level {
    #[must_use]
    pub fn is_wrc(&self) -> bool {
        *self == Level::World
    }

    #[must_use]
    pub fn is_regional(&self) -> bool {
        matches!(self, Self::RegionalA | Self::RegionalE | Self::RegionalNa)
    }

    #[must_use]
    pub fn is_national(&self) -> bool {
        matches!(
            self,
            Self::NationalA
                | Self::NationalC
                | Self::NationalF
                | Self::NationalLv
                | Self::NationalNz
                | Self::NationalR
                | Self::NationalUk
                | Self::NationalUs
        )
    }

    #[must_use]
    pub fn all_nationals() -> &'static [Self] {
        &[
            Self::NationalA,
            Self::NationalC,
            Self::NationalF,
            Self::NationalLv,
            Self::NationalNz,
            Self::NationalR,
            Self::NationalUk,
            Self::NationalUs,
        ]
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Link {
    title: String,
    url: Url,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Event {
    pub name: String,

    #[serde(deserialize_with = "deserialize_toml_date")]
    start: NaiveDate,

    #[serde(deserialize_with = "deserialize_toml_date")]
    pub end: NaiveDate,

    location: String,

    organizer: String,

    pub level: Level,

    #[serde(default)]
    website: Option<Url>,

    #[serde(default)]
    results: Option<Url>,

    #[serde(default)]
    media: Option<String>,

    /// `false` if we only have incomplete results (i.e. only champions).
    /// Will skip generating the results page.
    pub complete: bool,

    /// Will skip including it in lists of events.
    #[serde(default)]
    dummy: bool,

    #[serde(default)]
    links: Vec<Link>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct EventWithSlug {
    #[serde(flatten)]
    event: Event,

    /// Short lowercase name for the event (e.g `wrc2012`)
    pub slug: String,
}

impl std::ops::Deref for EventWithSlug {
    type Target = Event;

    fn deref(&self) -> &Self::Target {
        &self.event
    }
}

/// Returns all events, oldest first.
pub fn get_events(content_dir: &Path) -> anyhow::Result<Vec<EventWithSlug>> {
    let dir = content_dir.join("events");

    let mut events = std::fs::read_dir(dir)?
        .flat_map(|res| res.map(|e| e.path()))
        .filter(|path| path.extension().is_some_and(|s| s == "toml"))
        .map(|path| {
            let content = std::fs::read_to_string(&path)?;
            let slug = path
                .file_stem()
                .expect("File with extension should have stem")
                .to_str()
                .ok_or_else(|| anyhow!("{} not valid UTF-8 name", path.display()))?;

            let event = toml::from_str(&content)?;

            Ok(EventWithSlug {
                event,
                slug: slug.to_owned(),
            })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    // Oldest events first.
    events.sort_by_key(|event| event.start);

    Ok(events)
}

/// Only world championships.
#[must_use]
pub fn wrcs(events: &[EventWithSlug]) -> Vec<&EventWithSlug> {
    events.iter().filter(|event| event.level.is_wrc()).collect()
}

/// Separates events into those prequalifying to the next WRC and the remaining ones.
///
/// Two latest events at each level not older than `statute_of_limitations` count for qualification.
#[must_use]
pub fn extract_qualifying_events(
    events: &[EventWithSlug],
    statute_of_limitations: NaiveDate,
) -> (Vec<EventWithSlug>, Vec<EventWithSlug>) {
    let (non_expired_events, mut remaining_events) = events
        .iter()
        .cloned()
        .partition::<Vec<_>, _>(|event| event.end > statute_of_limitations);

    // Split by levels for manipulation.
    let mut grouped_events = HashMap::new();
    for event in non_expired_events {
        let events_at_level: &mut Vec<_> = grouped_events.entry(event.level).or_default();

        events_at_level.push(event);
    }

    // Limit to two latest events at each level.
    for events_at_level in grouped_events.values_mut() {
        events_at_level.sort_by_key(|event| Reverse(event.start));

        if events_at_level.len() > 2 {
            let extra_events_at_level = events_at_level.drain(2..);
            remaining_events.extend(extra_events_at_level);
        }
    }

    let mut qualifying_events: Vec<_> = grouped_events.into_values().flatten().collect();

    // Group by levels and sort by date.
    let ordering_key = |event: &EventWithSlug| {
        (
            Reverse(event.level.is_wrc()),
            Reverse(event.level.is_regional()),
            Reverse(event.level.is_national()),
            Reverse(event.start),
        )
    };

    qualifying_events.sort_by_key(ordering_key);
    remaining_events.sort_by_key(ordering_key);

    (qualifying_events, remaining_events)
}
