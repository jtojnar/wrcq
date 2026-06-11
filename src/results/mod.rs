//! Tools for generating results.

pub use self::{
    categories::{Age, Category, Gender},
    ranking::{Rankings, TeamWithRanking, rank_results},
};
use {
    anyhow::bail,
    serde::{Deserialize, Serialize},
    std::{
        cmp::Reverse,
        collections::BTreeSet,
        num::TryFromIntError,
        ops::Deref,
        path::{Path, PathBuf},
        str::FromStr,
    },
};

mod categories;
mod csv;
mod iof;
mod irf;
mod ranking;
mod xml;

#[derive(Clone, Copy, Debug)]
enum ResultFormat {
    Csv,
    Ssv,
    /// Either IOF or IRF format.
    Xml,
}

/// Locates the file with results and checks that there are not multiple candidates.
fn find_results_file(
    results_dir: &Path,
    slug: &String,
) -> anyhow::Result<Option<(PathBuf, ResultFormat)>> {
    let results_basename = results_dir.join(slug);

    let csv_results_path = results_basename.with_extension("csv");
    let ssv_results_path = results_basename.with_extension("ssv");
    let xml_results_path = results_basename.with_extension("xml");

    let existing_result_paths = [
        (csv_results_path, ResultFormat::Csv),
        (ssv_results_path, ResultFormat::Ssv),
        (xml_results_path, ResultFormat::Xml),
    ]
    .into_iter()
    .filter(|(path, _format)| path.exists())
    .collect::<Vec<_>>();

    match &existing_result_paths[..] {
        [(path, format)] => Ok(Some((path.clone(), *format))),

        [] => Ok(None),

        results => {
            let result_files = std::fmt::from_fn(|f| {
                results
                    .iter()
                    .enumerate()
                    .try_for_each(|(i, (path, _format))| {
                        if i > 0 {
                            write!(f, ", ")?;
                        }
                        write!(f, "{}", path.display())
                    })
            });

            bail!("Event {slug} has multiple result files: {result_files}");
        }
    }
}

#[derive(Clone, Hash, PartialEq, Eq, Deserialize, Serialize, PartialOrd, Ord)]
pub struct Country(pub String);

#[derive(Clone, Copy, PartialEq, Eq, Deserialize, Serialize, PartialOrd, Ord, Hash)]
pub struct Duration(pub u8);

impl Duration {
    #[must_use]
    pub fn is_24_hour(&self) -> bool {
        self.0 == 24
    }
}

impl Default for Duration {
    fn default() -> Self {
        Self(24)
    }
}

#[derive(Serialize)]
pub struct Team {
    pub name: Option<String>,
    pub score: i32,
    pub time: Time,
    pub penalty: i32,
    pub duration: Duration,
    pub category: Category,
    pub status: Status,
    pub members: Vec<Member>,
}

pub trait AsTeam {
    fn as_team(&self) -> &Team;
}

impl AsTeam for Team {
    fn as_team(&self) -> &Team {
        self
    }
}

impl<T> AsTeam for T
where
    T: Deref,
    T::Target: AsTeam,
{
    fn as_team(&self) -> &Team {
        self.deref().as_team()
    }
}

#[derive(Clone, Serialize)]
pub struct Member {
    #[serde(rename = "firstname")]
    pub first_name: String,

    #[serde(rename = "lastname")]
    pub last_name: String,

    #[serde(rename = "country_code")]
    pub country: Country,
}

impl Member {
    #[must_use]
    pub fn new(first_name: String, last_name: String, country: Country) -> Self {
        Self {
            first_name,
            last_name,
            country,
        }
    }
}

#[derive(Clone, Copy, Deserialize, Serialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    #[serde(rename = "not started")]
    NotStarted,

    Late,

    #[serde(rename = "not finished")]
    NotFinished,

    Withdrawn,

    Overtime,

    Disqualified,

    #[serde(rename = "out of competition")]
    OutOfCompetition,

    #[default]
    Finished,
}
impl Status {
    #[must_use]
    pub fn is_finished(&self) -> bool {
        matches!(self, Self::Finished)
    }
}

#[derive(Clone, Copy, PartialEq, PartialOrd, Eq, Ord)]
pub struct Time {
    pub hours: u8,
    pub minutes: u8,
    pub seconds: u8,
}

impl Time {
    fn try_from_secs(time_secs: u32) -> Result<Self, TryFromIntError> {
        let hours = u8::try_from(time_secs / 3600)?;
        let minutes = ((time_secs / 60) % 60) as u8;
        let seconds = (time_secs % 60) as u8;

        Ok(Self {
            hours,
            minutes,
            seconds,
        })
    }
}

impl Serialize for Time {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let Self {
            hours,
            minutes,
            seconds,
        } = self;

        let s = format!("{hours:02}:{minutes:02}:{seconds:02}");

        serializer.serialize_str(&s)
    }
}

pub fn deserialize_time_hms<'de, D>(deserializer: D) -> Result<Time, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let time_delta = <&str>::deserialize(deserializer)?;
    time_delta.parse().map_err(serde::de::Error::custom)
}

// TODO: review
impl FromStr for Time {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s == "0" {
            return Ok(Time {
                hours: 0,
                minutes: 0,
                seconds: 0,
            });
        }

        let mut parts = s.split(':');

        let hours = parts
            .next()
            .ok_or("Missing hours")?
            .parse()
            .map_err(|_| "Invalid hours")?;

        let minutes = parts
            .next()
            .ok_or("Missing minutes")?
            .parse()
            .map_err(|_| "Invalid minutes")?;

        let seconds = parts
            .next()
            .ok_or("Missing seconds")?
            .parse()
            .map_err(|_| "Invalid seconds")?;

        if parts.next().is_some() {
            return Err("too many parts");
        }

        Ok(Self {
            hours,
            minutes,
            seconds,
        })
    }
}

pub fn load_results(results_dir: &Path, slug: &String) -> anyhow::Result<Option<Vec<Team>>> {
    let Some((results_path, results_format)) = find_results_file(results_dir, slug)? else {
        return Ok(None);
    };

    let raw_results = match results_format {
        ResultFormat::Csv => csv::load_results(&results_path, csv::Separator::Comma)?,
        ResultFormat::Ssv => csv::load_results(&results_path, csv::Separator::Semicolon)?,
        ResultFormat::Xml => match detect_xml_format(&results_path)? {
            XmlFormat::Iof => iof::load_results(&results_path)?,
            XmlFormat::Irf => irf::load_results(&results_path)?,
        },
    };

    Ok(Some(raw_results))
}

fn dedup<T: Ord>(iter: impl Iterator<Item = T>) -> Vec<T> {
    iter.collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>()
}

/// Extracts every category the teams are eligible to rank in.
pub fn extract_categories(results: &[impl AsRef<TeamWithRanking>]) -> Vec<Category> {
    let team_categories = results
        .iter()
        .map(|team| team.as_ref().category)
        .collect::<BTreeSet<_>>();

    let mut all_categories = dedup(team_categories.iter().flat_map(Category::eligible).copied());

    all_categories.sort();

    all_categories
}

/// Extracts durations any team was registered for.
#[must_use]
pub fn extract_durations(results: &[TeamWithRanking]) -> Vec<Duration> {
    let mut durations = dedup(results.iter().map(|team| team.duration));

    durations.sort_by_key(|duration| Reverse(*duration));

    durations
}

enum XmlFormat {
    Iof,
    Irf,
}

fn detect_xml_format(results_path: &Path) -> anyhow::Result<XmlFormat> {
    let xml = std::fs::read_to_string(results_path)?;

    if xml.contains(" xmlns=\"http://www.orienteering.org/datastandard/3.0\"") {
        Ok(XmlFormat::Iof)
    } else if xml.contains("noNamespaceSchemaLocation=\"results.xsd\"") {
        Ok(XmlFormat::Irf)
    } else {
        bail!("Unknown XML format")
    }
}
