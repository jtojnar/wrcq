use {
    super::{Category, Country, Member, Status, Team, Time, xml::from_str_tracked},
    anyhow::{Context as _, anyhow, bail},
    serde::{Deserialize, Deserializer},
    std::{iter::repeat, path::Path},
};

#[derive(Deserialize)]
struct Results {
    #[serde(rename = "ClassResult")]
    classes: Vec<ClassResult>,
}

#[derive(Deserialize)]
struct ClassResult {
    #[serde(rename = "Class")]
    class: Class,

    #[serde(rename = "TeamResult")]
    #[serde(default)]
    teams: Vec<TeamResult>,
}

#[derive(Deserialize)]
struct Class {
    #[serde(rename = "Name")]
    #[serde(deserialize_with = "deserialize_text_as_category")]
    name: Category,
}

fn deserialize_text_as_category<'de, D>(deserializer: D) -> Result<Category, D::Error>
where
    D: Deserializer<'de>,
{
    let text: &str = quick_xml::serde_helpers::text_content::deserialize(deserializer)?;

    text.parse::<Category>().map_err(serde::de::Error::custom)
}

#[derive(Deserialize)]
struct TeamResult {
    #[serde(rename = "BibNumber")]
    #[serde(deserialize_with = "quick_xml::serde_helpers::text_content::deserialize")]
    id: u32,

    #[serde(rename = "Name")]
    #[serde(deserialize_with = "quick_xml::serde_helpers::text_content::deserialize")]
    name: Option<String>,

    #[serde(rename = "TeamMemberResult")]
    member_results: Vec<TeamMemberResult>,
}

#[derive(Deserialize)]
struct TeamMemberResult {
    #[serde(rename = "Person")]
    person: Person,

    #[serde(rename = "Result")]
    result: Option<PersonResult>,
}

#[derive(Deserialize)]
struct Person {
    #[serde(rename = "Name")]
    name: Name,

    #[serde(rename = "Nationality")]
    nationality: Option<Nationality>,
}

#[derive(Deserialize)]
struct Nationality {
    #[serde(rename = "@code")]
    country: Country,
}

#[derive(Deserialize)]
struct Name {
    #[serde(rename = "Given")]
    #[serde(deserialize_with = "quick_xml::serde_helpers::text_content::deserialize")]
    given: Option<String>,

    #[serde(rename = "Family")]
    #[serde(deserialize_with = "quick_xml::serde_helpers::text_content::deserialize")]
    family: String,
}

#[derive(Deserialize)]
struct PersonResult {
    #[serde(rename = "Score")]
    scores: Vec<Score>,

    #[serde(rename = "Time")]
    #[serde(deserialize_with = "quick_xml::serde_helpers::text_content::deserialize")]
    time_secs: u32,

    #[serde(rename = "Status")]
    #[serde(deserialize_with = "deserialize_text_as_status")]
    status: Status,
}

fn iof_status_to_status(iof: &str) -> Result<Status, String> {
    match iof {
        "OK" => Ok(Status::Finished),
        "OverTime" => Ok(Status::Overtime),
        "Disqualified" => Ok(Status::Disqualified),
        "DidNotFinish" => Ok(Status::NotFinished),
        "DidNotStart" => Ok(Status::NotStarted),
        _ => Err(format!("Unknown status {iof}")),
    }
}

fn deserialize_text_as_status<'de, D>(deserializer: D) -> Result<Status, D::Error>
where
    D: Deserializer<'de>,
{
    let text: &str = quick_xml::serde_helpers::text_content::deserialize(deserializer)?;

    iof_status_to_status(text).map_err(serde::de::Error::custom)
}

#[derive(Deserialize)]
struct Score {
    #[serde(rename = "@type")]
    kind: ScoreKind,

    #[serde(rename = "$value")]
    value: i32,
}

impl Score {
    fn value(&self) -> i32 {
        self.value
    }
}

#[derive(Deserialize)]
enum ScoreKind {
    Points,
    TotalPoints,
    PenaltyPoints,
}

fn result_to_team(result: TeamResult, category: Category) -> anyhow::Result<Team> {
    let TeamResult {
        id: _,
        name,
        member_results,
    } = result;

    let (total, persons) = member_results
        .into_iter()
        .partition::<Vec<_>, _>(|member| member.person.name.family == "TEAMTOTAL");

    let (status, time, score, penalty) =
        extract_teamtotal_data(&total).context("Failed to extract totals")?;

    let members = persons
        .into_iter()
        .map(
            |TeamMemberResult {
                 person:
                     Person {
                         name: Name { given, family },
                         nationality,
                     },
                 ..
             }| {
                let Nationality { country } = nationality.ok_or(anyhow!("Missing nationality"))?;
                let first_name = given.ok_or(anyhow!("Missing given name"))?;

                Ok::<_, anyhow::Error>(Member {
                    first_name,
                    last_name: family,
                    country,
                })
            },
        )
        .enumerate()
        .map(|(i, p)| p.with_context(|| format!("Failed to process person {i}")))
        .collect::<anyhow::Result<_>>()?;

    let duration = super::Duration::default();

    Ok(Team {
        name,
        score,
        time,
        penalty,
        duration,
        category,
        status,
        members,
    })
}

fn extract_teamtotal_data(total: &[TeamMemberResult]) -> anyhow::Result<(Status, Time, i32, i32)> {
    let result = match total {
        [
            TeamMemberResult {
                person: _,
                result: Some(result),
            },
        ] => result,

        [
            TeamMemberResult {
                person: _,
                result: None,
            },
        ] => bail!("Missing TEAMTOTAL Result element"),

        [] => bail!("Missing TEAMTOTAL"),

        _ => bail!("Multiple TEAMTOTALs"),
    };

    let PersonResult {
        scores,
        time_secs,
        status,
    } = result;

    let time = Time::try_from_secs(*time_secs)?;

    let (score, penalty) = extract_scores(scores)?;

    Ok((*status, time, score, penalty))
}

fn extract_scores(scores: &[Score]) -> anyhow::Result<(i32, i32)> {
    let total_points = scores
        .iter()
        .find(|score| matches!(score.kind, ScoreKind::TotalPoints))
        .map(Score::value);
    let points = scores
        .iter()
        .find(|score| matches!(score.kind, ScoreKind::Points))
        .map(Score::value);
    let penalty = scores
        .iter()
        .find(|score| matches!(score.kind, ScoreKind::PenaltyPoints))
        .map(Score::value);

    match (total_points, points, penalty) {
        (None, Some(points), None) => Ok((points, 0)),
        (None, Some(points), Some(penalty)) => Ok((points - penalty, penalty)),
        (Some(total_points), None, None) => Ok((total_points, 0)),
        (Some(total_points), _, Some(penalty)) => Ok((total_points, penalty)),
        (Some(total_points), Some(points), None) => Ok((total_points, points - total_points)),
        (None, None, _) => bail!("Missing both TotalPoints and Points"),
    }
}

pub(super) fn load_results(path: &Path) -> anyhow::Result<Vec<Team>> {
    let content = std::fs::read_to_string(path)?;

    from_str_tracked::<Results>(&content)
        .with_context(|| format!("Failed to parse IOF XML {}", path.display()))?
        .classes
        .into_iter()
        .flat_map(|class| class.teams.into_iter().zip(repeat(class.class.name)))
        .map(|(team, class)| {
            let team_id = team.id;
            let team_name = team.name.clone();

            result_to_team(team, class).with_context(|| {
                let name = std::fmt::from_fn(|f| {
                    let Some(name) = team_name.as_ref() else {
                        return Ok(());
                    };
                    write!(f, " ({name})")
                });

                format!("Failed to process team {team_id}{name}")
            })
        })
        .collect()
}
