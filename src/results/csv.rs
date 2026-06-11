use {
    super::{
        Age, Category, Country, Duration, Gender, Member, Status, Team, Time, deserialize_time_hms,
    },
    anyhow::{Context as _, bail},
    csv::ReaderBuilder,
    serde::Deserialize,
    std::path::Path,
};

#[derive(Deserialize)]
struct TeamRow {
    name: Option<String>,

    age: Age,
    gender: Gender,
    duration: Option<Duration>,

    score: i32,
    penalty: i32,

    #[serde(deserialize_with = "deserialize_time_hms")]
    time: Time,

    status: Option<Status>,

    #[serde(rename = "member1country")]
    member1_country: Country,
    #[serde(rename = "member1lastname")]
    member1_last_name: String,
    #[serde(rename = "member1firstname")]
    member1_first_name: String,

    #[serde(rename = "member2country", default)]
    member2_country: Option<Country>,
    #[serde(rename = "member2lastname", default)]
    member2_last_name: Option<String>,
    #[serde(rename = "member2firstname", default)]
    member2_first_name: Option<String>,

    #[serde(rename = "member3country", default)]
    member3_country: Option<Country>,
    #[serde(rename = "member3lastname", default)]
    member3_last_name: Option<String>,
    #[serde(rename = "member3firstname", default)]
    member3_first_name: Option<String>,

    #[serde(rename = "member4country", default)]
    member4_country: Option<Country>,
    #[serde(rename = "member4lastname", default)]
    member4_last_name: Option<String>,
    #[serde(rename = "member4firstname", default)]
    member4_first_name: Option<String>,

    #[serde(rename = "member5country", default)]
    member5_country: Option<Country>,
    #[serde(rename = "member5lastname", default)]
    member5_last_name: Option<String>,
    #[serde(rename = "member5firstname", default)]
    member5_first_name: Option<String>,
}

#[derive(Clone, Copy)]
pub(super) enum Separator {
    Semicolon,
    Comma,
}

impl Separator {
    fn to_byte(self) -> u8 {
        match self {
            Self::Semicolon => b';',
            Self::Comma => b',',
        }
    }

    fn other(self) -> Self {
        match self {
            Self::Semicolon => Self::Comma,
            Self::Comma => Self::Semicolon,
        }
    }
}

fn maybe_member(
    first_name: Option<String>,
    last_name: Option<String>,
    country: Option<Country>,
) -> Option<Member> {
    Some(Member::new(first_name?, last_name?, country?))
}

impl From<TeamRow> for Team {
    fn from(val: TeamRow) -> Self {
        let TeamRow {
            name,
            age,
            gender,
            duration,
            penalty,
            time,
            status,
            score,
            member1_country,
            member1_last_name,
            member1_first_name,
            member2_country,
            member2_last_name,
            member2_first_name,
            member3_country,
            member3_last_name,
            member3_first_name,
            member4_country,
            member4_last_name,
            member4_first_name,
            member5_country,
            member5_last_name,
            member5_first_name,
        } = val;

        let duration = duration.unwrap_or_default();
        let status = status.unwrap_or_default();
        let category = Category::new(age, gender);

        let members = std::iter::once(Member::new(
            member1_first_name,
            member1_last_name,
            member1_country,
        ))
        .chain(maybe_member(
            member2_first_name,
            member2_last_name,
            member2_country,
        ))
        .chain(maybe_member(
            member3_first_name,
            member3_last_name,
            member3_country,
        ))
        .chain(maybe_member(
            member4_first_name,
            member4_last_name,
            member4_country,
        ))
        .chain(maybe_member(
            member5_first_name,
            member5_last_name,
            member5_country,
        ))
        .collect();

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

pub(super) fn load_results(path: &Path, separator: Separator) -> anyhow::Result<Vec<Team>> {
    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .trim(csv::Trim::Fields)
        .delimiter(separator.to_byte())
        .from_path(path)
        .with_context(|| format!("Failed to open {}", path.display()))?;

    let headers = reader
        .headers()
        .with_context(|| format!("Failed to parse get headers in {}", path.display()))?;

    let other_separator: char = separator.other().to_byte().into();
    if headers.len() == 1 && headers[0].contains(other_separator) {
        bail!(
            "Looks like {} contains values separated by `{other_separator}`. \
            Please fix the extension.",
            path.display(),
        );
    }

    let teams = reader
        .into_deserialize::<TeamRow>()
        .map(|result| {
            result
                .map(Team::from)
                .with_context(|| format!("Failed to parse CSV row in {}", path.display()))
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(teams)
}
