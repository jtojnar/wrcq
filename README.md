# wrcq

This is the software for computing the set of persons pre-qualified for participation in future World Rogaining Championships. You can access it live at <https://pqe.rogaining.org/>.

## Adding an event

WRC event manager will log into <https://pqe.rogaining.org/> and create the event entry. Then they will be able to upload results in one of the following machine readable result formats.

The results file should also be committed into this repository for archival purposes.

### Supported result formats

#### CSV and SSV

[CSV](https://en.wikipedia.org/wiki/Comma-separated_values) is the simplest supported format:

- Rows separated by `\n` (carriage return).
- Columns separated by `,` (comma), or `;` (semicolon) in the case of SSV.
- First line must contain a header (column names).
- The following columns are supported:
  - `id` – numeric ID of the team
  - `name` (optional) – team name
  - `gender` – Sex part of category of the team, one of:
    - `men`
    - `women`
    - `mixed`
  - `age` – Age part of category of the team, one of:
    - `under18`
    - `under20`
    - `under23`
    - `junior`
    - `youth`
    - `open`
    - `veteran`
    - `superveteran`
    - `ultraveteran`
  - `time` – time on track in `hh:mm:ss` format, example: `24:01:17`
  - `score` – final score (number of scored points minus the number of points lost on penalty)
  - `penalty` (optional) – number of points lost (e.g. due to being overtime), example: `50`
  - `status` (optional) – Status of the team result.
    One of the following:
    - `not started`
    - `not finished`
    - `overtime`
    - `disqualified`
    - `withdrawn`
    - `out of competition`
    - `finished` (default)

    Anything other than `finished` will not be ranked.
  - `member1country` – three letter [IOC country code](https://en.wikipedia.org/wiki/List_of_IOC_country_codes)
  - `member1firstname` – First name of the 
  - `member1lastname`

Further members can be added.

Example of full header with up to five team members:

```
id,name,gender,age,time,score,penalty,status,member1country,member1firstname,member1lastname,member2country,member2firstname,member2lastname,member3country,member3firstname,member3lastname,member4country,member4firstname,member4lastname,member5country,member5firstname,member5lastname
```

#### IOF XML

We support `ResultList` message element from [International Orienteering Federation Data Standard 3.0](https://orienteering.sport/iof/it/data-standard-3-0/).

#### IRF XML

This is our own simpler XML format. See the [XML schema](result/results.xsd) or [WRC 2022 results](result/wrc2022.xml) as an example.
