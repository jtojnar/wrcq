//! Helpers for parsing dates in TOML files into types from [`chrono`] library.

use {
    chrono::{NaiveDate, NaiveDateTime},
    serde::{Deserialize, Deserializer},
};

pub fn deserialize_toml_date<'de, D>(deserializer: D) -> Result<NaiveDate, D::Error>
where
    D: Deserializer<'de>,
{
    let date = toml::value::Date::deserialize(deserializer)?;

    date.to_string()
        .parse::<NaiveDate>()
        .map_err(serde::de::Error::custom)
}

pub fn deserialize_toml_date_time<'de, D>(deserializer: D) -> Result<NaiveDateTime, D::Error>
where
    D: Deserializer<'de>,
{
    let datetime = toml::value::Datetime::deserialize(deserializer)?;

    datetime
        .to_string()
        .parse::<NaiveDateTime>()
        .map_err(serde::de::Error::custom)
}
