/// Tools for tracing qualifications.
use {
    super::ParticipationBag,
    crate::{
        events::EventWithSlug,
        results::{Age, Category, Country, Gender, Member},
    },
    chrono::NaiveDate,
    derive_where::derive_where,
    log::trace,
    serde::{Deserialize, Serialize, Serializer},
    std::{cmp::Reverse, collections::BTreeMap},
    unaccent::unaccent,
};

#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub struct PersonId {
    name: String,
    country: Country,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Person {
    #[serde(rename(serialize = "firstname"))]
    pub first_name: String,
    #[serde(rename(serialize = "lastname"))]
    pub last_name: String,
    pub country: Country,
}

impl Person {
    pub(super) fn id(&self) -> PersonId {
        let Self {
            first_name,
            last_name,
            country,
        } = self;

        PersonId {
            name: unaccent(format!("{last_name} {first_name}").to_lowercase()),
            country: country.clone(),
        }
    }
}

impl From<&'_ Member> for Person {
    fn from(member: &Member) -> Self {
        let Member {
            first_name,
            last_name,
            country,
        } = member.clone();

        Self {
            first_name,
            last_name,
            country,
        }
    }
}

/// Registry of qualifications.
#[derive_where(Default)]
#[derive(Serialize)]
pub struct Qualified<Q> {
    auto: ChapterQualifications<Q>,
    preferred: ChapterQualifications<Q>,
}

pub struct UnresolvedQualification {
    criterion: Criterion,
    event: Option<String>,
    gender: Option<Gender>,
    age: Option<Age>,
    position: Option<u32>,
    star_warning: ActivityCheck,
    id_applicable: ActivityCheck,
    date: Option<NaiveDate>,
}

pub type ActivityCheck = fn(&ParticipationBag<'_>, &Person) -> bool;

impl Qualified<UnresolvedQualification> {
    fn push(&mut self, person: Person, qualification: UnresolvedQualification) {
        let qualified = match qualification.criterion.kind() {
            CriterionKind::Automatic => &mut self.auto,
            CriterionKind::Preferred => &mut self.preferred,
        };

        qualified.push(person, qualification);
    }

    pub(super) fn push_ranked_full(
        &mut self,
        criterion: Criterion,
        event: &EventWithSlug,
        category: Category,
        place: u32,
        person: Person,
        star_warning: ActivityCheck,
        id_applicable: ActivityCheck,
    ) {
        self.push(
            person,
            UnresolvedQualification {
                criterion,
                event: Some(event.slug.clone()),
                gender: Some(category.gender),
                age: Some(category.age),
                position: Some(place),
                star_warning,
                id_applicable,
                date: Some(event.end),
            },
        );
    }

    pub(super) fn push_ranked(
        &mut self,
        criterion: Criterion,
        event: &EventWithSlug,
        category: Category,
        place: u32,
        person: Person,
    ) {
        self.push_ranked_full(
            criterion,
            event,
            category,
            place,
            person,
            |_, _| false,
            |_, _| true,
        );
    }

    pub(super) fn push_1_4(&mut self, person: Person) {
        self.push(
            person,
            UnresolvedQualification {
                criterion: Criterion::OneFour,
                event: None,
                gender: None,
                age: None,
                position: None,
                star_warning: |_, _| false,
                id_applicable: |_, _| true,
                date: None,
            },
        );
    }

    #[must_use]
    pub fn resolve(self, participation_bag: &ParticipationBag) -> Qualified<Reason> {
        let Self { auto, preferred } = self;

        Qualified {
            auto: auto.resolve(participation_bag),
            preferred: preferred.resolve(participation_bag),
        }
    }
}

#[derive_where(Default)]
#[derive(Serialize)]
struct ChapterQualifications<Q> {
    #[serde(flatten)]
    countries: BTreeMap<Country, CountryQualifications<Q>>,
}

impl ChapterQualifications<UnresolvedQualification> {
    fn push(&mut self, person: Person, qualification: UnresolvedQualification) {
        self.countries
            .entry(person.country.clone())
            .or_default()
            .push(person, qualification);
    }

    fn resolve(self, participation_bag: &ParticipationBag) -> ChapterQualifications<Reason> {
        let Self { countries } = self;

        ChapterQualifications {
            countries: countries
                .into_iter()
                .map(|(country_code, qualifications)| {
                    (country_code, qualifications.resolve(participation_bag))
                })
                .filter(|(_, qualifications)| !qualifications.persons.is_empty())
                .collect(),
        }
    }
}

#[derive_where(Default)]
#[derive(Serialize)]
#[serde(transparent)]
#[serde(bound = "Q: Serialize")]
struct CountryQualifications<Q> {
    #[serde(serialize_with = "serialize_values")]
    persons: BTreeMap<PersonId, IndividualQualifications<Q>>,
}

fn serialize_values<S, K, V>(map: &BTreeMap<K, V>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    V: Serialize,
{
    serializer.collect_seq(map.values())
}

impl CountryQualifications<UnresolvedQualification> {
    fn push(&mut self, person: Person, qualification: UnresolvedQualification) {
        self.persons
            .entry(person.id())
            .or_insert_with(|| IndividualQualifications::new(person))
            .push(qualification);
    }

    fn resolve(self, participation_bag: &ParticipationBag) -> CountryQualifications<Reason> {
        let Self { persons } = self;

        CountryQualifications {
            persons: persons
                .into_iter()
                .map(|(id, qualifications)| (id, qualifications.resolve(participation_bag)))
                .filter(|(_, qualifications)| !qualifications.reasons.is_empty())
                .collect(),
        }
    }
}

#[derive(Serialize)]
struct IndividualQualifications<Q> {
    #[serde(flatten)]
    person: Person,
    reasons: Vec<Q>,
}

impl<Q> IndividualQualifications<Q> {
    fn new(person: Person) -> Self {
        Self {
            person,
            reasons: Vec::default(),
        }
    }
}

impl IndividualQualifications<UnresolvedQualification> {
    fn push(&mut self, qualification: UnresolvedQualification) {
        self.reasons.push(qualification);
    }

    fn resolve(self, participation_bag: &ParticipationBag) -> IndividualQualifications<Reason> {
        let Self { person, reasons } = self;

        let mut reasons: Vec<_> = reasons
            .into_iter()
            .filter_map(|qualification| {
                let UnresolvedQualification {
                    criterion,
                    event,
                    gender,
                    age,
                    position,
                    star_warning,
                    id_applicable,
                    date,
                } = qualification;

                if !id_applicable(participation_bag, &person) {
                    let criterion = serde_variant::to_variant_name(&criterion)
                        .expect("Failed to serialize criterion");
                    let Person {
                        first_name: first,
                        last_name: last,
                        country,
                    } = &person;
                    let country = &country.0;

                    trace!(
                        "Not qualifying {first} {last} ({country}) for criterion {criterion}, \
                        inactive"
                    );

                    return None;
                }

                let star_warning = star_warning(participation_bag, &person);

                Some(Reason {
                    criterion,
                    event,
                    gender,
                    age,
                    position,
                    star_warning,
                    date,
                })
            })
            .collect();

        reasons.sort_by_key(|reason| (reason.criterion, reason.date, Reverse(reason.age)));

        IndividualQualifications { person, reasons }
    }
}

#[derive(Serialize)]
pub struct Reason {
    criterion: Criterion,
    event: Option<String>,
    #[serde(serialize_with = "gender_short")]
    gender: Option<Gender>,
    #[serde(serialize_with = "age_short")]
    age: Option<Age>,
    position: Option<u32>,
    #[serde(rename(serialize = "starWarning"))]
    star_warning: bool,
    #[serde(skip)]
    date: Option<NaiveDate>,
}

fn gender_short<S>(gender: &Option<Gender>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let Some(gender) = gender else {
        return serializer.serialize_none();
    };

    serializer.serialize_str(gender.short())
}

fn age_short<S>(age: &Option<Age>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let Some(age) = age else {
        return serializer.serialize_none();
    };

    serializer.serialize_str(age.short())
}

enum CriterionKind {
    Automatic,
    Preferred,
}

#[derive(Clone, Copy, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub(super) enum Criterion {
    #[serde(rename = "1.1")]
    OneOne,

    #[serde(rename = "1.2a")]
    OneTwoA,

    #[serde(rename = "1.2b")]
    OneTwoB,

    #[serde(rename = "1.2c")]
    OneTwoC,

    #[serde(rename = "1.2d")]
    OneTwoD,

    #[serde(rename = "1.3")]
    OneThree,

    #[serde(rename = "1.4")]
    OneFour,

    #[serde(rename = "2.1")]
    TwoOne,

    #[serde(rename = "2.2")]
    TwoTwo,

    #[serde(rename = "2.3")]
    TwoThree,

    #[serde(rename = "2.4a")]
    TwoFourA,

    #[serde(rename = "2.4b")]
    TwoFourB,
}

impl Criterion {
    fn kind(self) -> CriterionKind {
        match self {
            Self::OneOne
            | Self::OneTwoA
            | Self::OneTwoB
            | Self::OneTwoC
            | Self::OneTwoD
            | Self::OneThree
            | Self::OneFour => CriterionKind::Automatic,

            Self::TwoOne | Self::TwoTwo | Self::TwoThree | Self::TwoFourA | Self::TwoFourB => {
                CriterionKind::Preferred
            }
        }
    }
}
