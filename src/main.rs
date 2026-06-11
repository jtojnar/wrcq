use {
    anyhow::Context as _,
    chrono::{NaiveDate, Utc},
    log::info,
    serde_json::json,
    std::{
        collections::BTreeMap,
        fs,
        path::{Path, PathBuf},
    },
    wrcq::{
        assets::copy_statics,
        config::{Config, load_config},
        events::{EventWithSlug, extract_qualifying_events, get_events, wrcs},
        qualified::{
            ParticipationBag, Qualified, QualifyingEvents, Reason, UnresolvedQualification,
            collect_irf_councillors, collect_qualifications,
        },
        results::{
            Duration, Gender, extract_categories, extract_durations, load_results, rank_results,
        },
        template::Templates,
        updates::{Update, get_updates},
    },
};

/// Generates the home page.
fn build_home(
    output_dir: &Path,
    templates: &Templates,
    updates: &[Update],
    events: &[EventWithSlug],
) -> anyhow::Result<()> {
    let output_path = output_dir.join("index.html");

    // Show last five updates.
    let updates = updates.iter().take(5).collect::<Vec<_>>();

    // Show all WRCs.
    let events: Vec<_> = wrcs(events);

    let data = json!({
        "updates": updates,
        "events": events,
        "last": true,
    });

    let contents = templates.render_page("index.hbs", &data)?;

    fs::write(output_path, contents)?;

    Ok(())
}

/// Generates the archive of updates page.
fn build_archive(
    output_dir: &Path,
    templates: &Templates,
    updates: &[Update],
) -> anyhow::Result<()> {
    let output_dir = output_dir.join("archive");
    fs::create_dir_all(&output_dir)?;

    let output_path = output_dir.join("index.html");

    let data = json!({
        "updates": updates,
        "first": true,
        "last": true,
    });

    let contents = templates.render_page("updates_archive.hbs", &data)?;

    fs::write(output_path, contents)?;

    Ok(())
}

/// Generates the *List of events* page.
fn build_event_archive(
    output_dir: &Path,
    config: &Config,
    templates: &Templates,
    events: &[EventWithSlug],
) -> anyhow::Result<()> {
    let output_dir = output_dir.join("events");
    fs::create_dir_all(&output_dir)?;

    let output_path = output_dir.join("index.html");

    let Config {
        upcoming_wrc_year,
        statute_of_limitations,
        ..
    } = config;

    let (qualifying_events, remaining_events) =
        extract_qualifying_events(events, *statute_of_limitations);

    let data = json!({
        "title": format!("List of current prequalifying events for WRC {upcoming_wrc_year}"),
        "events": {"events": qualifying_events},
        "pastEvents": {"events": remaining_events},
    });

    let contents = templates.render_page("events.hbs", &data)?;

    fs::write(output_path, contents)?;

    Ok(())
}

/// Generates the *List of pre-qualified entrants* page.
fn build_qualified(
    current_date: NaiveDate,
    output_dir: &Path,
    config: &Config,
    templates: &Templates,
    qualified: &Qualified<Reason>,
) -> anyhow::Result<()> {
    let output_path_json = output_dir.join("qualified.json");

    let output_dir = output_dir.join("qualified");
    fs::create_dir_all(&output_dir)?;

    let output_path = output_dir.join("index.html");

    let Config {
        upcoming_wrc_year,
        manager_email,
        list_is_preliminary,
        ..
    } = config;

    let data = json!({
        "title": format!("List of pre-qualified entrants for WRC {upcoming_wrc_year}"),
        "qualified": qualified,
        "managerEmail": manager_email,
        "preliminary": list_is_preliminary,
        "upcomingYear": upcoming_wrc_year,
        "datetime": current_date,
    });

    let contents = templates.render_page("qualified.hbs", &data)?;

    fs::write(output_path, contents)?;

    let json_data = serde_json::to_string(&data)?;

    fs::write(output_path_json, json_data)?;

    Ok(())
}

/// Generates the results page for a specific `event`.
fn build_event(
    output_dir: &Path,
    results_dir: &Path,
    templates: &Templates,
    participation_bag: &mut ParticipationBag,
    qualified: &mut Qualified<UnresolvedQualification>,
    qualifying_events: &QualifyingEvents,
    event: &EventWithSlug,
) -> anyhow::Result<()> {
    let EventWithSlug { slug, .. } = event;

    let Some(results) = load_results(results_dir, slug)
        .with_context(|| format!("Failed to load results for {slug}"))?
    else {
        info!("Event {slug} has no results file.");
        return Ok(());
    };

    let (teams, counters) = rank_results(results)?;

    let top_three_open = |gender| {
        teams
            .iter()
            .filter(|team| {
                team.duration.is_24_hour()
                    && team.category.gender == gender
                    && team.status.is_finished()
            })
            .take(3)
            .collect::<Vec<_>>()
    };

    let filter_teams = |duration| {
        teams
            .iter()
            .filter(|team| team.duration == duration)
            .collect::<Vec<_>>()
    };

    let mo = top_three_open(Gender::Men);
    let xo = top_three_open(Gender::Mixed);
    let wo = top_three_open(Gender::Women);

    let all_categories = extract_categories(&teams);
    let durations = extract_durations(&teams);

    let teams = filter_teams(Duration::default());

    for team in &teams {
        participation_bag.participated(event, &team.team);
    }

    collect_qualifications(qualifying_events, qualified, &teams, &counters, event);

    if !event.complete {
        info!("Not generating results for event {slug}, not marked as complete.");
        return Ok(());
    }

    let output_dir = output_dir.join("events").join(slug).join("results");
    fs::create_dir_all(&output_dir)?;

    let counters = serde_json::to_string(&counters)?;
    let all_durations = (durations.len() > 1).then_some(durations.clone());
    let event_name = &event.name;

    for active_duration in durations.iter().copied() {
        let file_name = results_file_name(active_duration);
        let output_path = output_dir.join(&file_name);

        let teams = filter_teams(active_duration);

        let displayed_categories = extract_categories(&teams)
            .into_iter()
            .map(|category| (category, 1))
            .collect::<BTreeMap<_, _>>();

        let data = json!({
            "title": format!("Results of {event_name}"),
            "event": event,
            "teams": teams,
            "mo": {"teams": mo},
            "xo": {"teams": xo},
            "wo": {"teams": wo},
            "is": displayed_categories,
            "activeCategory": null,
            "categories": all_categories,
            "counters": counters,
            "activeDuration": active_duration,
            "durations": all_durations,
        });

        let contents = templates.render_page("results.hbs", &data)?;

        fs::write(output_path, contents)?;
    }

    Ok(())
}

fn results_file_name(duration: Duration) -> String {
    let duration = (!duration.is_24_hour())
        .then_some(duration)
        .map(|duration| duration.0);

    match duration {
        None => "index.html".to_string(),
        Some(dur) => format!("index-{dur}.html"),
    }
}

/// Generates the results pages for all `events`.
fn build_events(
    output_dir: &Path,
    results_dir: &Path,
    templates: &Templates,
    participation_bag: &mut ParticipationBag,
    qualifying_events: &QualifyingEvents,
    qualified: &mut Qualified<UnresolvedQualification>,
    events: &[EventWithSlug],
) -> anyhow::Result<()> {
    for event in events {
        build_event(
            output_dir,
            results_dir,
            templates,
            participation_bag,
            qualified,
            qualifying_events,
            event,
        )?;
    }

    Ok(())
}

fn main() -> anyhow::Result<()> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp(None)
        .format_target(false)
        .init();

    let output_dir = PathBuf::from("_public");
    fs::create_dir_all(&output_dir)?;
    let content_dir = PathBuf::from("content");
    let results_dir = PathBuf::from("result");
    let view_dir = PathBuf::from("view");
    let static_dir = PathBuf::from("public");
    let assets_dir = PathBuf::from("node_modules");

    let templates = Templates::new(&view_dir)?;

    let updates = get_updates(&content_dir)?;
    let events = get_events(&content_dir)?;
    let config = load_config(&content_dir)?;

    let current_date = Utc::now().date_naive();

    // TODO: add this to config.
    let entries_opening = current_date;

    let mut qualified = Qualified::default();

    let qualifying_events = QualifyingEvents::new(entries_opening, &config, &events);

    let mut participation_bag = ParticipationBag::new(&qualifying_events, entries_opening);

    collect_irf_councillors(&content_dir, &mut qualified)?;

    build_home(&output_dir, &templates, &updates, &events)?;

    build_archive(&output_dir, &templates, &updates)?;

    build_event_archive(&output_dir, &config, &templates, &events)?;

    build_events(
        &output_dir,
        &results_dir,
        &templates,
        &mut participation_bag,
        &qualifying_events,
        &mut qualified,
        &events,
    )?;

    let qualified = qualified.resolve(&participation_bag);

    build_qualified(current_date, &output_dir, &config, &templates, &qualified)?;

    copy_statics(&output_dir, &static_dir, &assets_dir)?;

    Ok(())
}
