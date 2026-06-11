use {
    super::{
        Age, Category, Country, Duration, Gender, Member, Status, Team, Time, deserialize_time_hms,
        xml::from_str_tracked,
    },
    anyhow::Context as _,
    serde::Deserialize,
    std::path::Path,
};

#[derive(Deserialize)]
struct Results {
    #[serde(rename = "team")]
    teams: Vec<TeamElement>,
}

#[derive(Deserialize)]
struct TeamElement {
    #[serde(rename = "member")]
    members: Vec<MemberElement>,

    #[serde(rename = "@name")]
    name: Option<String>,

    #[serde(rename = "@score")]
    score: i32,

    #[serde(rename = "@time")]
    #[serde(deserialize_with = "deserialize_time_hms")]
    time: Time,

    #[serde(rename = "@penalty")]
    penalty: i32,

    #[serde(rename = "@duration")]
    duration: Option<Duration>,

    #[serde(rename = "@gender")]
    gender: Gender,

    #[serde(rename = "@age")]
    age: Age,

    #[serde(rename = "@status")]
    status: Option<Status>,
}

impl From<TeamElement> for Team {
    fn from(val: TeamElement) -> Self {
        let TeamElement {
            name,
            age,
            gender,
            duration,
            penalty,
            time,
            status,
            score,
            members,
        } = val;

        let duration = duration.unwrap_or_default();
        let status = status.unwrap_or_default();
        let category = Category::new(age, gender);

        let members = members.into_iter().map(Member::from).collect();

        Team {
            name,
            score,
            time,
            penalty,
            duration,
            category,
            status,
            members,
        }
    }
}

#[derive(Deserialize)]
struct MemberElement {
    #[serde(rename = "@firstname")]
    first_name: String,

    #[serde(rename = "@lastname")]
    last_name: String,

    #[serde(rename = "@country")]
    country: Country,
}

impl From<MemberElement> for Member {
    fn from(val: MemberElement) -> Self {
        let MemberElement {
            first_name,
            last_name,
            country,
        } = val;

        Member::new(first_name, last_name, country)
    }
}

pub(super) fn load_results(path: &Path) -> anyhow::Result<Vec<Team>> {
    let content = std::fs::read_to_string(path)?;

    let xml = from_str_tracked::<Results>(&content)
        .with_context(|| format!("Failed to parse IRF XML {}", path.display()))?
        .teams
        .into_iter()
        .map(Team::from)
        .collect();

    Ok(xml)
}
