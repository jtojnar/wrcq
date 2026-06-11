//! Main configuration file (`content/config.toml`).

use {
    crate::toml_datetime_parser::deserialize_toml_date, anyhow::Context as _, chrono::NaiveDate,
    serde::Deserialize, std::path::Path,
};

/// The main config data structure.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    /// Contact e-mail address to be linked on the PQE list prior to finalization.
    pub manager_email: String,

    /// Whether to show warning on the PQE list page that it is not yet finalized.
    pub list_is_preliminary: bool,

    /// Which year’s WRC does the PQE list belong to.
    pub upcoming_wrc_year: u32,

    /// Events that happened prior to this date will generally be excluded from consideration for pre-qualification criteria.
    ///
    /// Should be three years before the event.
    // TODO: Calculate this from event date.
    #[serde(deserialize_with = "deserialize_toml_date")]
    pub statute_of_limitations: NaiveDate,
}

/// Loads the config from `{content_dir}/config.toml`.
pub fn load_config(content_dir: &Path) -> anyhow::Result<Config> {
    let path = content_dir.join("config.toml");
    let content = std::fs::read_to_string(&path).context("Failed to read config.toml")?;
    let config = toml::from_str(&content).context("Failed to parse config.toml")?;

    Ok(config)
}
