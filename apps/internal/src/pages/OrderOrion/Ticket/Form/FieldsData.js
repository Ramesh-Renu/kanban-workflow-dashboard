const FieldsData = ({ companyInfo, activeBoardCode, props }) => {
  return [
    {
      id: "industrySelect",
      fieldName: "industrySector",
      label: "Industry/Sector",
      values: companyInfo?.industrySector || [],
      options: props?.industryData,
      labelField: "industryname",
      valueField: "industryid",
      isMandatory: true,
      multi: false,
      disabled:
        !props.formData.isProcessOrder ||
        props?.setCannotEidit.includes("industrySector")
          ? true
          : false,
    },
    {
      id: "regionSelect",
      fieldName: "region",
      label: "Region",
      values: companyInfo?.region || [],
      options: props?.regionList,
      labelField: "name",
      valueField: "countryId",
      nestedList: true,
      isMandatory: activeBoardCode === "OB" ? true : false,
      multi: false,
      disabled: props?.setCannotEidit.includes("region") ? true : false,
    },
    {
      id: "countrySelect",
      fieldName: "country",
      label: "Country",
      values: companyInfo?.country || [],
      options: props?.countryList,
      labelField: "country_name",
      valueField: "country_id",
      isMandatory: activeBoardCode === "OB" ? true : false,
      multi: false,
      disabled: props?.setCannotEidit.includes("country") ? true : false,
    },
    {
      id: "primaryMarketSelect",
      fieldName: "primaryMarket",
      label: "Primary Market",
      values: companyInfo?.primaryMarket || [],
      options: props?.marketRegionList,
      labelField: "marketname",
      valueField: "marketid",
      isMandatory: true,
      multi: false,
      disabled: props?.setCannotEidit.includes("primaryMarket") ? true : false,
    },
    // {
    //   id: "languageSelect",
    //   fieldName: "language",
    //   label: "Language",
    //   values: companyInfo?.language || [],
    //   options: props?.customerLanguageList,
    //   labelField: "languageName",
    //   valueField: "languageId",
    //   isMandatory: true,
    //   multi: true,
    //   optionType: "checkbox",
    //   customSearch: true,
    //   disabled: props?.setCannotEidit.includes("language") ? true : false,
    // },
  ];
};
export default FieldsData;
