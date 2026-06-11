//! Manages static assets like images, JavaScript and CSS files.

use {
    fs_extra::dir::{CopyOptions, copy},
    std::path::Path,
};

/// Copies static files to `output_dir`.
pub fn copy_statics(output_dir: &Path, static_dir: &Path, assets_dir: &Path) -> anyhow::Result<()> {
    let opts = CopyOptions::new().overwrite(true);

    copy(assets_dir, output_dir, &opts)?;

    copy(static_dir, output_dir, &opts.content_only(true))?;

    Ok(())
}
