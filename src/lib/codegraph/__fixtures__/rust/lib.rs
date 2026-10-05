use crate::util::normalize;
use std::collections::HashMap;

pub const DEFAULT_LEVEL: &str = "warn";

pub trait Formatter {
    fn format(&self, msg: &str) -> String;
}

pub struct Reporter {
    count: u32,
}

impl Reporter {
    pub fn new() -> Self {
        Reporter { count: 0 }
    }

    pub fn report(&self, msg: &str) -> String {
        normalize(msg)
    }
}

pub fn format(msg: &str) -> String {
    let mut table: HashMap<&str, u32> = HashMap::new();
    table.insert(msg, 1);
    normalize(msg)
}
