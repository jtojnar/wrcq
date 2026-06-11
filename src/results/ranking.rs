use {
    super::{Category, Duration, Team},
    serde::Serialize,
    std::{cmp::Reverse, collections::HashMap, ops::Deref},
};

#[derive(Serialize)]
pub struct TeamWithRanking {
    #[serde(flatten)]
    pub team: Team,
    #[serde(flatten)]
    pub ranking: Ranking,
}

#[derive(Serialize, Default)]
pub struct Ranking {
    pub place: Option<u32>,
    #[serde(flatten)]
    pub categories: HashMap<Category, u32>,
}

impl Deref for TeamWithRanking {
    type Target = Team;

    fn deref(&self) -> &Self::Target {
        &self.team
    }
}

impl AsRef<TeamWithRanking> for TeamWithRanking {
    fn as_ref(&self) -> &TeamWithRanking {
        self
    }
}

pub fn rank_results(
    mut raw_results: Vec<Team>,
) -> anyhow::Result<(Vec<TeamWithRanking>, Rankings)> {
    raw_results.sort_by_key(|result| {
        (
            Reverse(result.status.is_finished()),
            Reverse(result.score),
            result.time,
        )
    });

    let mut rankings = Rankings::default();

    let results = raw_results
        .into_iter()
        .map(|team| TeamWithRanking {
            ranking: rankings.next(&team),
            team,
        })
        .collect();

    Ok((results, rankings))
}

#[derive(Serialize, Default)]
pub struct Rankings {
    #[serde(flatten)]
    rankings: HashMap<Duration, RankingCounter>,
}

impl Rankings {
    fn next(&mut self, team: &Team) -> Ranking {
        self.rankings.entry(team.duration).or_default().next(team)
    }

    #[must_use]
    pub fn counts_for_24h(&self) -> HashMap<Category, u32> {
        self.rankings
            .get(&Duration::default())
            .map(|counter| counter.inner.clone())
            .unwrap_or_default()
    }
}

#[derive(Serialize, Default)]
pub struct RankingCounter {
    #[serde(rename = "all")]
    total_place: u32,
    #[serde(flatten)]
    inner: HashMap<Category, u32>,
}

impl RankingCounter {
    fn next(&mut self, team: &Team) -> Ranking {
        self.total_place += 1;

        let categories = team
            .category
            .eligible()
            .iter()
            .map(|&category| {
                let position = self.inner.entry(category).or_default();
                *position += 1;
                (category, *position)
            })
            .collect();

        // Increasing number of participants even though they did not finish.
        // It will not affect the ranking of finished teams since they will be listed first.
        // TODO: This should probably be moved to top but it will affect limits (e.g. 1.2a for WY4@wrc2022).
        if !team.status.is_finished() {
            return Ranking::default();
        }

        Ranking {
            place: Some(self.total_place),
            categories,
        }
    }
}
