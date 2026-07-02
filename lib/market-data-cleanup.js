const placeholderFields = [
  "shortFloat",
  "epsNtm",
  "peNtm",
  "volume",
  "sharesOutstanding",
  "floatShares",
  "shortInterestShares",
];

const placeholderCleanupWhere = {
  OR: placeholderFields.map((field) => ({
    [field]: {
      not: null,
    },
  })),
};

const placeholderNullData = placeholderFields.reduce((acc, field) => {
  acc[field] = null;
  return acc;
}, {});

module.exports = {
  placeholderFields,
  placeholderCleanupWhere,
  placeholderNullData,
};
