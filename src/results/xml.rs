use {anyhow::anyhow, serde::Deserialize};

// Based on <https://github.com/tafia/quick-xml/issues/697>
pub fn from_str_tracked<'de, T>(s: &'de str) -> anyhow::Result<T>
where
    T: Deserialize<'de>,
{
    let de = &mut quick_xml::de::Deserializer::from_str(s);

    let mut track = serde_path_to_error::Track::new();
    let pd = serde_path_to_error::Deserializer::new(de, &mut track);

    T::deserialize(pd).map_err(|err| {
        let path = track.path();
        anyhow!("Parse error at `{path}`: {err}")
    })
}
