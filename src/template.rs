//! Helpers for generating HTML from Handlebars templates.

use {
    anyhow::Context as _,
    chrono::{Datelike, NaiveDate, NaiveDateTime},
    handlebars::{
        Context, Handlebars, Helper, HelperDef, HelperResult, Output, RenderContext,
        RenderErrorReason, Renderable,
    },
    serde::Serialize,
    std::{
        path::Path,
        sync::{Arc, Mutex},
    },
};

pub struct Templates {
    handlebars: Handlebars<'static>,
    view_dir: std::path::PathBuf,
}

impl Templates {
    pub fn new(view_dir: &Path) -> anyhow::Result<Self> {
        let mut handlebars = Handlebars::new();

        let partial_dir = view_dir.join("partial");

        handlebars.set_prevent_indent(true);

        handlebars.register_template_file("layout", view_dir.join("layout.hbs"))?;

        handlebars.register_template_file("calendar", partial_dir.join("calendar.hbs"))?;
        handlebars.register_template_file("event", partial_dir.join("event.hbs"))?;
        handlebars.register_template_file(
            "country_qualified",
            partial_dir.join("country_qualified.hbs"),
        )?;
        handlebars.register_template_file("result", partial_dir.join("result.hbs"))?;
        handlebars.register_template_file("resultlight", partial_dir.join("resultlight.hbs"))?;
        handlebars.register_template_file("update", partial_dir.join("update.hbs"))?;

        register_helpers(&mut handlebars);

        Ok(Self {
            view_dir: view_dir.to_owned(),
            handlebars,
        })
    }

    pub fn render_page(&self, page: &str, data: &impl Serialize) -> anyhow::Result<String> {
        let path = self.view_dir.join(page);
        let template = std::fs::read_to_string(&path)
            .with_context(|| format!("Failed to load template from {}", path.display()))?;

        let contents = self
            .handlebars
            .render_template(&template, &data)
            .with_context(|| format!("Failed to render template from {}", path.display()))?;

        Ok(contents)
    }
}

fn register_helpers(handlebars: &mut Handlebars<'_>) {
    handlebars.register_helper("date", Box::new(date));

    handlebars.register_helper("dateinterval", Box::new(date_interval));

    // `Time` already serializes as formatted string.
    handlebars.register_helper("time", Box::new(string_id));

    // `Gender` in contexts using this helper already serializes as short.
    handlebars.register_helper("genderclass", Box::new(string_id));

    // `Age` in contexts using this helper already serializes as short.
    handlebars.register_helper("ageclass", Box::new(string_id));

    handlebars.register_helper("equals", Box::new(equals));

    handlebars.register_helper("index", Box::new(index));

    let bottom = Arc::new(Mutex::new(String::new()));

    handlebars.register_helper(
        "block",
        Box::new(BlockHelper {
            bottom: Arc::clone(&bottom),
        }),
    );

    handlebars.register_helper("extend", Box::new(ExtendHelper { bottom }));
}

fn parse_date_or_datetime(input: &str) -> Result<NaiveDate, chrono::ParseError> {
    input
        .parse::<NaiveDateTime>()
        .map(|dt| dt.date())
        .or_else(|_| input.parse::<NaiveDate>())
}

fn date_fmt(date: NaiveDate) -> String {
    date.format("%-d %b %Y").to_string()
}

fn date_interval_fmt(start: NaiveDate, end: NaiveDate) -> String {
    format!(
        "{}–{}",
        start.format(if start.year() == end.year() {
            "%-d %b"
        } else {
            "%-d %b %Y"
        }),
        end.format("%-d %b %Y"),
    )
}

fn date(
    h: &Helper,
    _r: &Handlebars,
    _ctx: &Context,
    _rc: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let date_str = h
        .param(0)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("date", 0))?
        .value()
        .as_str()
        .ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "date",
                "#0".to_string(),
                "String".to_string(),
            )
        })?;

    let date = parse_date_or_datetime(date_str)
        .map(date_fmt)
        .map_err(|_| {
            RenderErrorReason::ParamTypeMismatchForName(
                "date",
                "#0".to_string(),
                "Datetime".to_string(),
            )
        })?;

    out.write(&date)?;
    Ok(())
}

fn date_interval(
    h: &Helper,
    _r: &Handlebars,
    _ctx: &Context,
    _rc: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let start = h
        .param(0)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("dateinterval", 0))?
        .value()
        .as_str()
        .ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "dateinterval",
                "#0".to_string(),
                "String".to_string(),
            )
        })?;
    let start = parse_date_or_datetime(start).map_err(|_| {
        RenderErrorReason::ParamTypeMismatchForName(
            "dateinterval",
            "#0".to_string(),
            "Datetime".to_string(),
        )
    })?;

    let end = h
        .param(1)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("dateinterval", 1))?
        .value()
        .as_str()
        .ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "dateinterval",
                "#1".to_string(),
                "String".to_string(),
            )
        })?;
    let end = parse_date_or_datetime(end).map_err(|_| {
        RenderErrorReason::ParamTypeMismatchForName(
            "dateinterval",
            "#1".to_string(),
            "Datetime".to_string(),
        )
    })?;

    out.write(&date_interval_fmt(start, end))?;
    Ok(())
}

fn string_id(
    h: &Helper,
    _r: &Handlebars,
    _ctx: &Context,
    _rc: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let value = h
        .param(0)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("string_id", 0))?
        .value()
        .as_str()
        .ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "string_id",
                "#0".to_string(),
                "String".to_string(),
            )
        })?;

    out.write(value)?;

    Ok(())
}

fn equals<'reg, 'rc>(
    h: &Helper<'rc>,
    r: &'reg Handlebars<'reg>,
    ctx: &'rc Context,
    rc: &mut RenderContext<'reg, 'rc>,
    out: &mut dyn Output,
) -> HelperResult {
    let primary = h
        .param(0)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("equals", 0))?
        .value();
    let secondary = h
        .param(1)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("equals", 1))?
        .value();

    if primary == secondary {
        if let Some(t) = h.template() {
            t.render(r, ctx, rc, out)?;
        }
    } else if let Some(inv) = h.inverse() {
        inv.render(r, ctx, rc, out)?;
    }

    Ok(())
}

fn index(
    h: &Helper,
    _r: &Handlebars,
    _ctx: &Context,
    _rc: &mut RenderContext,
    out: &mut dyn Output,
) -> HelperResult {
    let value = h
        .param(0)
        .ok_or(RenderErrorReason::ParamNotFoundForIndex("index", 0))?
        .value()
        .as_u64()
        .ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "index",
                "#0".to_string(),
                "u64".to_string(),
            )
        })?;

    let value = value + 1;

    out.write(&format!("{value}"))?;

    Ok(())
}

struct BlockHelper {
    bottom: Arc<Mutex<String>>,
}

impl HelperDef for BlockHelper {
    fn call<'reg: 'rc, 'rc>(
        &self,
        h: &Helper<'rc>,
        _r: &'reg Handlebars<'reg>,
        _ctx: &'rc Context,
        _rc: &mut RenderContext<'reg, 'rc>,
        out: &mut dyn Output,
    ) -> HelperResult {
        let param = h
            .param(0)
            .ok_or(RenderErrorReason::ParamNotFoundForIndex("block", 0))?;

        let param = param.value().as_str().ok_or_else(|| {
            RenderErrorReason::ParamTypeMismatchForName(
                "block",
                "#0".to_string(),
                "String".to_string(),
            )
        })?;

        match param {
            "bottom" => {
                let mut bottom = self.bottom.lock().expect("Panic lock");
                // Clear the block so that pages do not clobber themselves.
                // This is a horrible hack but not sure how else to do this.
                let bottom = std::mem::take(&mut *bottom);
                out.write(&bottom)?;
            }

            _ => {
                Err(RenderErrorReason::BlockContentRequired)?;
            }
        }

        Ok(())
    }
}

struct ExtendHelper {
    bottom: Arc<Mutex<String>>,
}

impl HelperDef for ExtendHelper {
    fn call<'reg: 'rc, 'rc>(
        &self,
        h: &Helper<'rc>,
        r: &'reg Handlebars<'reg>,
        ctx: &'rc Context,
        rc: &mut RenderContext<'reg, 'rc>,
        _out: &mut dyn Output,
    ) -> HelperResult {
        let block_name = h
            .param(0)
            .ok_or(RenderErrorReason::ParamNotFoundForIndex("extend", 0))?
            .value()
            .as_str()
            .ok_or_else(|| {
                RenderErrorReason::ParamTypeMismatchForName(
                    "extend",
                    "#0".to_string(),
                    "String".to_string(),
                )
            })?;

        let mut block = match block_name {
            "bottom" => self.bottom.lock().expect("Panic lock"),

            _ => {
                return Err(RenderErrorReason::PartialNotFound(format!(
                    "Unknown or non-extensible block {block_name}"
                ))
                .into());
            }
        };

        let body = h
            .template()
            .ok_or(RenderErrorReason::BlockContentRequired)?;

        let contents = body.renders(r, ctx, rc)?;

        block.push_str(&contents);

        Ok(())
    }
}
