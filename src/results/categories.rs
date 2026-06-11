use {
    konst::iter::collect_const,
    serde::{Deserialize, Serialize},
    std::str::FromStr,
};

#[derive(Clone, Copy, Hash, Deserialize, Serialize, PartialEq, PartialOrd, Eq, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Men,
    Mixed,
    Women,
}

impl Gender {
    #[must_use]
    pub const fn short(&self) -> &str {
        match self {
            Self::Men => "M",
            Self::Mixed => "X",
            Self::Women => "W",
        }
    }

    #[must_use]
    pub const fn all() -> &'static [Self] {
        &[Self::Men, Self::Mixed, Self::Women]
    }
}

#[derive(Clone, Copy, Hash, Deserialize, Serialize, PartialEq, PartialOrd, Eq, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Age {
    Under18,
    Under20,
    Under23,
    Junior,
    Youth,
    Open,
    Veteran,
    Superveteran,
    Ultraveteran,
}

impl Age {
    #[must_use]
    pub const fn all() -> &'static [Self] {
        &[
            Self::Under18,
            Self::Under20,
            Self::Under23,
            Self::Junior,
            Self::Youth,
            Self::Open,
            Self::Veteran,
            Self::Superveteran,
            Self::Ultraveteran,
        ]
    }

    #[must_use]
    pub const fn short(&self) -> &str {
        match self {
            Self::Under18 => "18",
            Self::Under20 => "20",
            Self::Under23 => "23",
            Self::Junior => "J",
            Self::Youth => "Y",
            Self::Open => "O",
            Self::Veteran => "V",
            Self::Superveteran => "SV",
            Self::Ultraveteran => "UV",
        }
    }

    #[must_use]
    pub const fn eligible(&self) -> &'static [Self] {
        match self {
            Self::Under18 => &[Self::Under18, Self::Open],
            Self::Under20 => &[Self::Under20, Self::Open],
            Self::Under23 => &[Self::Under23, Self::Open],
            Self::Junior => &[Self::Junior, Self::Open],
            Self::Youth => &[Self::Youth, Self::Open],
            Self::Open => &[Self::Open],
            Self::Veteran => &[Self::Open, Self::Veteran],
            Self::Superveteran => &[Self::Open, Self::Veteran, Self::Superveteran],
            Self::Ultraveteran => &[
                Self::Open,
                Self::Veteran,
                Self::Superveteran,
                Self::Ultraveteran,
            ],
        }
    }
}

#[derive(Clone, Copy, Hash, PartialEq, PartialOrd, Eq, Ord)]
pub struct Category {
    pub gender: Gender,
    pub age: Age,
}

impl Category {
    #[must_use]
    pub const fn new(age: Age, gender: Gender) -> Self {
        Self { gender, age }
    }

    #[must_use]
    pub const fn open(gender: Gender) -> Self {
        Self::new(Age::Open, gender)
    }

    #[must_use]
    pub fn short(&self) -> String {
        let age = self.age.short();
        let gender = self.gender.short();
        format!("{gender}{age}")
    }

    const GENDER_LEN: usize = Gender::all().len();

    const ALL_LEN: usize = Age::all().len() * Self::GENDER_LEN;

    // TODO: Switch to array::from_fn once stabilized
    // https://github.com/rust-lang/rust/issues/147606
    const ALL: [Category; Self::ALL_LEN] = {
        let mut c = [Category::open(Gender::Men); Self::ALL_LEN];
        let mut i = 0;

        while i < c.len() {
            c[i] = Category::new(
                Age::all()[i / Self::GENDER_LEN],
                Gender::all()[i % Self::GENDER_LEN],
            );
            i += 1;
        }

        c
    };

    #[must_use]
    pub fn all() -> &'static [Category] {
        &Self::ALL
    }

    // TODO: Switch to array::from_fn once stabilized
    // https://github.com/rust-lang/rust/issues/147606
    const ALL_OPEN: [Category; Self::GENDER_LEN] = {
        let mut c = [Category::open(Gender::Men); Self::GENDER_LEN];
        let mut i = 0;

        while i < c.len() {
            c[i] = Category::open(Gender::all()[i]);
            i += 1;
        }

        c
    };

    #[must_use]
    pub fn all_open() -> &'static [Category] {
        &Self::ALL_OPEN
    }

    #[must_use]
    pub fn eligible(&self) -> &'static [Category] {
        macro_rules! cross_match {
            (@ match $self:ident $out:tt [ $(,)? ] $b:tt $init_b:tt) => {
                match $self $out
            };
            (@ match $self:ident $out:tt [$a:ident, $($at:tt)*] [ $(,)? ] $init_b:tt) => {
                cross_match!(@ match $self $out [$($at)*] $init_b $init_b)
            };
            (@ match $self:ident { $($out:tt)* } [$age:ident, $($at:tt)*] [$gender:ident, $($bt:tt)*] $init_b:tt) => {
                cross_match!(@
                    match $self {
                        $($out)*
                        Category { gender: Gender::$gender, age: Age::$age } => &collect_const!(
                            Category => Age::$age.eligible(),
                            map(|&age| Category { gender: Gender::$gender, age }),
                        ),
                    }
                    [$age, $($at)*]
                    [$($bt)*] $init_b)
            };

            ($self:ident, [$($a:tt)*], [$($b:tt)*]) => {
                cross_match!(@ match $self {} [$($a)*,] [$($b)*,] [$($b)*,])
            };
        }

        cross_match!(
            self,
            [
                Under18,
                Under20,
                Under23,
                Junior,
                Youth,
                Open,
                Veteran,
                Superveteran,
                Ultraveteran,
            ],
            [Men, Mixed, Women]
        )
    }
}

impl Serialize for Category {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.short())
    }
}

impl FromStr for Category {
    type Err = String;

    fn from_str(cat: &str) -> Result<Self, Self::Err> {
        match cat {
            "MO" => Ok(Category::new(Age::Open, Gender::Men)),
            "XO" => Ok(Category::new(Age::Open, Gender::Mixed)),
            "WO" => Ok(Category::new(Age::Open, Gender::Women)),
            "MV" => Ok(Category::new(Age::Veteran, Gender::Men)),
            "XV" => Ok(Category::new(Age::Veteran, Gender::Mixed)),
            "WV" => Ok(Category::new(Age::Veteran, Gender::Women)),
            "MSV" => Ok(Category::new(Age::Superveteran, Gender::Men)),
            "XSV" => Ok(Category::new(Age::Superveteran, Gender::Mixed)),
            "WSV" => Ok(Category::new(Age::Superveteran, Gender::Women)),
            "MUV" => Ok(Category::new(Age::Ultraveteran, Gender::Men)),
            "XUV" => Ok(Category::new(Age::Ultraveteran, Gender::Mixed)),
            "WUV" => Ok(Category::new(Age::Ultraveteran, Gender::Women)),
            "MJ" => Ok(Category::new(Age::Junior, Gender::Men)),
            "XJ" => Ok(Category::new(Age::Junior, Gender::Mixed)),
            "WJ" => Ok(Category::new(Age::Junior, Gender::Women)),
            "MY" => Ok(Category::new(Age::Youth, Gender::Men)),
            "XY" => Ok(Category::new(Age::Youth, Gender::Mixed)),
            "WY" => Ok(Category::new(Age::Youth, Gender::Women)),
            "M18" => Ok(Category::new(Age::Under18, Gender::Men)),
            "X18" => Ok(Category::new(Age::Under18, Gender::Mixed)),
            "W18" => Ok(Category::new(Age::Under18, Gender::Women)),
            "M20" => Ok(Category::new(Age::Under20, Gender::Men)),
            "X20" => Ok(Category::new(Age::Under20, Gender::Mixed)),
            "W20" => Ok(Category::new(Age::Under20, Gender::Women)),
            "M23" => Ok(Category::new(Age::Under23, Gender::Men)),
            "X23" => Ok(Category::new(Age::Under23, Gender::Mixed)),
            "W23" => Ok(Category::new(Age::Under23, Gender::Women)),
            unknown => Err(unknown.to_owned()),
        }
    }
}
