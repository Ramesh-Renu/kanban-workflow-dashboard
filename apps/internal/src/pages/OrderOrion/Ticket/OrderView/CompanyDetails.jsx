import { t } from "i18next";
import React, { Fragment, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { updateMatserInfoWithValue } from "../../../../utils/common";
import InstrumentTable from "../Form/Instrument/InstrumentTable";
import { useGlobalContext } from "store/context/GlobalProvider";
import { gotoPageIcon } from "assets/images";

const CompanyDetails = ({ companyData, sourceData, setCanShow, activeBoardCode }) => {
  const [companyInfo, setCompanyInfo] = useState();
  const [contactInfo, setContactInfo] = useState();
  const nillData = "---";
  const { instrumentData } = useGlobalContext();

  useEffect(() => {
    const companyInfo = updateMatserInfoWithValue(companyData.companyInfo, sourceData);
    setCompanyInfo(companyInfo);
    setContactInfo(companyData.contactForm);
  }, []);

  // label and and values sections
  const hasInstrumentData =
    Array.isArray(companyInfo?.instrument) && companyInfo?.instrument?.length > 0;

  const sections = [
    {
      title: t("order_view.basic_details"),
      data: [
        {
          label: t("order_view.company_name"),
          value: companyInfo?.companyName || nillData,
        },
        {
          label: t("order_view.company_code"),
          value: companyInfo?.companyCode || nillData,
        },
        {
          label: t("order_view.industry_sector"),
          value:
            companyInfo?.industrySector
              ?.map((industry) => industry.industryname)
              .join(", ") || nillData,
        },
        {
          label: t("order_view.region"),
          value:
            companyInfo?.region?.map((country) => country.name).join(", ") || nillData,
        },
        {
          label: t("order_view.website_link"),
          value:
            (companyInfo?.websiteLink?.length > 0 && (
              <a
                className="websiteLink_anchor"
                href={
                  companyInfo?.websiteLink
                    ? `https://${companyInfo?.websiteLink.replace(/^https?:\/\//, "")}`
                    : ""
                }
                title={
                  companyInfo?.websiteLink
                    ? `https://${companyInfo?.websiteLink.replace(/^https?:\/\//, "")}`
                    : ""
                }
                target="_blank"
                rel="noreferrer"
              >
                <span className="websiteLink_text">{companyInfo?.websiteLink}</span>
                <img src={gotoPageIcon} alt="gotoPageIcon" className="gotoPageIcon gotoPageIcon_website" />
              </a>
            )) ||
            nillData,
        },
        {
          label: t("order_view.primary_market"),
          value:
            companyInfo?.primaryMarket?.map((market) => market.marketname).join(", ") ||
            nillData,
        },
        {
          label: t("order_view.primary_market_isin"),
          value: companyInfo?.isin || nillData,
        },
        {
          label: t("order_view.primary_market_symbol"),
          value: companyInfo?.symbol || nillData,
        },
        ...(hasInstrumentData
          ? [
              {
                label: t("order_view.secondary_markets"),
                value: companyInfo?.instrument,
                key: "secondaryMarket",
              },
            ]
          : []),
        //     {
        //       label: t("order_view.secondary_market_real_time_data"),
        //       value:
        //         companyInfo?.instrument
        //           ?.map((instrument) =>
        //             instrument.realTimeData ? "Yes" : "No"
        //           )
        //           .join(", ") || nillData,
        //     },
        //     {
        //       label: t("order_view.secondary_market_symbol"),
        //       value:
        //         companyInfo?.instrument
        //           ?.map((instrument) => instrument.symbol)
        //           .join(", ") || nillData,
        //     },
        //     {
        //       label: t("order_view.secondary_market_isin"),
        //       value:
        //         companyInfo?.instrument
        //           ?.map((instrument) => instrument.isin)
        //           .join(", ") || nillData,
        //     },
        //   ]
        // : []),
        {
          label: "Other Data",
          value: companyInfo?.otherData || [],
          key: "otherData",
        },
      ],
    },
    ...(activeBoardCode === "OB" || activeBoardCode === "SA"
      ? [
          {
            title: t("order_view.primary_contact"),
            data: [
              {
                label: t("order_view.name"),
                value: contactInfo?.primaryContact?.fullName || nillData,
              },
              {
                label: t("order_view.email"),
                value: contactInfo?.primaryContact?.emailID || nillData,
              },
              {
                label: t("order_view.phone"),
                value: contactInfo?.primaryContact?.phoneNumber || nillData,
              },
              {
                label: t("order_view.designation"),
                value: contactInfo?.primaryContact?.designation || nillData,
              },
            ],
          },
          {
            title: t("order_view.secondary_contact"),
            data: [
              {
                label: t("order_view.name"),
                value: contactInfo?.secondaryContact?.fullName || nillData,
              },
              {
                label: t("order_view.email"),
                value: contactInfo?.secondaryContact?.emailID || nillData,
              },
              {
                label: t("order_view.phone"),
                value: contactInfo?.secondaryContact?.phoneNumber || nillData,
              },
              {
                label: t("order_view.designation"),
                value: contactInfo?.secondaryContact?.designation || nillData,
              },
            ],
          },
        ]
      : []),
  ];

  // Reusable component for displaying fields and values
  const FieldGroup = ({ title, data }) => {
    let hasRenderedOtherData = false;

    return (
      <>
        <h6 className="mt-4 w-100 overview-subhead">{title}</h6>

        {data?.map((item, index) => {
          // Render 'otherData' only once
          if (item.key === "otherData" && !hasRenderedOtherData) {
            if (item.value.length === 0) return null;
            hasRenderedOtherData = true;

            return (
              <Fragment key={`otherData-block-${index}`}>
                {Array.isArray(item.value) &&
                  item.value.map((t, i) => {
                    if (t?.fieldValue !== "" && t?.fieldValue != null) {
                      return (
                        <Col
                          lg={6}
                          md={12}
                          xs={12}
                          className="d-flex flex-row align-items-center justify-content-between labelValueContainer py-3"
                          key={`otherData-item-${i}`}
                        >
                          <Col xl={5} lg={6} md={6} className="p-0">
                            <p className="label_field">{t?.fieldName}</p>
                          </Col>
                          <Col md={7} className="p-0">
                            <p
                              className="value_field"
                              title={
                                typeof t?.fieldValue === "string"
                                  ? t?.fieldValue
                                  : undefined
                              }
                            >
                              {React.isValidElement(t?.fieldValue)
                                ? t.fieldValue
                                : typeof t?.fieldValue === "object"
                                  ? "[Object]"
                                  : t?.fieldValue}
                            </p>
                          </Col>
                        </Col>
                      );
                    }
                    return null;
                  })}
              </Fragment>
            );
          } else if (item.key === "secondaryMarket") {
            return (
              <Col
                md={12}
                className="d-flex flex-row align-items-center justify-content-between labelValueContainer py-3 fs-14"
                key={`field-${index}`}
              >
                <Col className="p-0">
                  <p className="label_field">{item?.label}</p>
                  <div className="instrumentTable mt-2">
                    <InstrumentTable
                      viewOnly={true}
                      instruments={instrumentData?.data}
                      selectedInstrumentIds={item?.value}
                      onSelectInstrument={[]}
                      className="instrumentTable"
                    />
                  </div>
                </Col>
              </Col>
            );
          }

          // Render normal fields
          return (
            <Col
              lg={6}
              md={12}
              xs={12}
              key={`field-${index}`}
              className="d-flex flex-row align-items-center justify-content-between labelValueContainer py-3"
            >
              <Col xl={5} lg={6} md={6} className="p-0">
                <p className="label_field">{item?.label}</p>
              </Col>
              <Col md={7} className="p-0">
                <p
                  className="value_field"
                  title={typeof item.value === "string" ? item.value : undefined}
                >
                  {Array.isArray(item.value)
                    ? item.value.map((v, idx) =>
                        typeof v === "object" ? "[Object]" : <span key={idx}>{v}</span>,
                      )
                    : React.isValidElement(item.value)
                      ? item.value
                      : typeof item.value === "object"
                        ? "[Object]"
                        : item.value}
                </p>
              </Col>
            </Col>
          );
        })}
      </>
    );
  };

  return (
    <div className="companyDetails">
      <Row className="mx-auto align-items-center d-flex flex-row flex-wrap ">
        {sections.map((section, index) => (
          <FieldGroup key={index} title={section.title} data={section.data} />
        ))}
      </Row>
    </div>
  );
};

export default CompanyDetails;
