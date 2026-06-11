//! Manages update posts (from `content/updates/*.md`).

use {
    crate::toml_datetime_parser::deserialize_toml_date_time,
    anyhow::{anyhow, bail},
    chrono::NaiveDateTime,
    serde::{Deserialize, Serialize},
    std::{cmp::Reverse, collections::HashMap, fs, path::Path},
};

#[derive(Deserialize)]
struct User {
    name: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct UpdateMeta {
    #[serde(deserialize_with = "deserialize_toml_date_time")]
    timestamp: NaiveDateTime,
    author: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Update {
    #[serde(flatten)]
    meta: UpdateMeta,
    text: String,
}

/// Collects update posts from `{content_dir}/updates`, newest first.
pub fn get_updates(content_dir: &Path) -> anyhow::Result<Vec<Update>> {
    let dir = content_dir.join("updates");

    let users = get_users(content_dir)?;

    let mut updates = fs::read_dir(dir)?
        .flat_map(|res| res.map(|e| e.path()))
        .filter(|path| path.extension().is_some_and(|s| s == "md"))
        .map(|path| {
            let content = fs::read_to_string(&path)?;
            let (front_matter, text) = extract_front_matter(&content)?;

            let mut meta = toml::from_str(front_matter)?;
            resolve_users(&users, &mut meta)?;

            Ok(Update {
                meta,
                text: text.to_owned(),
            })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    // Newest articles first.
    updates.sort_by_key(|update| Reverse(update.meta.timestamp));

    Ok(updates)
}

fn extract_front_matter(text: &str) -> anyhow::Result<(&str, &str)> {
    let Some(rest) = text.strip_prefix("+++\n") else {
        return Ok(("", text));
    };

    let Some((front_matter, text)) = rest.split_once("+++\n") else {
        bail!("Missing front matter closing mark");
    };

    Ok((front_matter, text.trim()))
}

fn get_users(content_dir: &Path) -> anyhow::Result<HashMap<String, User>> {
    let path = content_dir.join("users.toml");

    let content = fs::read_to_string(&path)?;

    let users = toml::from_str(&content)?;

    Ok(users)
}

fn resolve_users(users: &HashMap<String, User>, meta: &mut UpdateMeta) -> anyhow::Result<()> {
    let author = &mut meta.author;

    *author = users
        .get(author)
        .ok_or(anyhow!("Unknown author {author}"))?
        .name
        .clone();

    Ok(())
}
