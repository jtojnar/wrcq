use {
    super::registry::Person,
    super::{Qualified, UnresolvedQualification},
    anyhow::Context as _,
    serde::Deserialize,
    std::path::Path,
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Councillors {
    #[serde(rename = "councillor")]
    councillors: Vec<Person>,
}

/// Per criterion 1.4, colects IRF councillors from `councillors.toml`.
pub fn collect_irf_councillors(
    content_dir: &Path,
    qualified: &mut Qualified<UnresolvedQualification>,
) -> anyhow::Result<()> {
    let path = content_dir.join("councillors.toml");

    let content = std::fs::read_to_string(&path).context("Failed to read councillors.toml")?;

    let councillors: Councillors =
        toml::from_str(&content).context("Failed to parse councillors.toml")?;

    for councillor in councillors.councillors {
        qualified.push_1_4(councillor);
    }

    Ok(())
}
