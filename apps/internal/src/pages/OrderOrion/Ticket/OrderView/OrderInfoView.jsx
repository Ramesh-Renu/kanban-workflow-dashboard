import React, { Fragment, useEffect, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import LogoAvatarShowLetter from "../../../../components/common/LogoAvatarShowLetter";
import { t } from "i18next";
import RichTextEditor from "../../../../components/common/RichTextEditor/Editor";
import {
  getLimitedHtmlWithNewlineContent,
  isCharacterLimitExceeded,
  renderOrderType,
  updateMatserInfoWithValue,
} from "../../../../utils/common";
import { useGlobalMaster } from "@orion/shared";
import dayjs from "dayjs";
import {
  updateOrderDescription,
  getTicketDetails,
  createProcessOrder,
} from "../../../../services";
import { useToast } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider";
import appConstants from "../../../../constant/common";
import ShowMoreLessElement from "../../../../components/common/ShowMoreLessElement";
import DOMPurify from "dompurify";
import { pencilSimpleLine } from "../../../../assets/images";

const OrderInfoView = ({ companyData, enableProcess, onCompanyDataUpdate, setCannotShow }) => {
  //   VARIABLE DECLARATIONS
  const { showToast } = useToast();
  const { dispatch } = useGlobalContext();
  const [getCompanyData, setCompanyData] = useState(companyData);
  const [description, setDescription] = useState(companyData?.description);
  const [enteredCharacter, setEnteredCharacter] = useState(0);
  const [balanceCharacter, setBalanceCharacter] = useState(null);
  const [focusedFlag, setFocusedFlag] = useState(false);
  const [showEditComment, setShowEditComment] = useState(false);
  const popref = useRef();
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};

  useEffect(() => {
    setCompanyData(companyData);
  }, [companyData]);

  const {
    orderType,
    orderCategory,
    marketRegionList,
    languageList,
    getOrderType,
    getOrderCategory,
    getMarketRegionList,
    getLanguageList,
  } = useGlobalMaster();

  // if masterState  empty need to call this func

  useEffect(() => {
    if (!orderType?.loading && orderType?.data?.length === 0) {
      getOrderType();
    }
    if (!orderCategory?.loading && orderCategory?.data?.length === 0) {
      getOrderCategory();
    }
    if (!marketRegionList?.loading && marketRegionList?.data?.length === 0) {
      getMarketRegionList();
    }
    if (!languageList?.loading && languageList?.data?.length === 0) {
      getLanguageList();
    }
  }, []);

  useEffect(() => {
    setDescription(companyData?.description || "");
    setShowEditComment(false);
  }, [companyData?.description]);

  const sourceData = {
    marketRegionList: marketRegionList?.data,
    customerLanguageList: languageList?.data,
  };
  const getCompanyInfo =
    getCompanyData?.companyInfo &&
    updateMatserInfoWithValue(getCompanyData?.companyInfo, sourceData);

  //label and value render
  const LabelValueRender = [
    {
      label: t("order_view.company_code"),
      value: getCompanyData?.companyInfo?.companyCode || "---",
    },
    {
      label: t("order_view.design_link"),
      value: getCompanyData?.branding?.designLink || "",
      typeof: "link",
    },
    {
      label: t("order_view.language"),
      value:
        getCompanyInfo?.language?.map((lang) => lang.languageName).join(", ") ||
        "---",
    },
    {
      label: t("order_view.website_link"),
      value: getCompanyData?.companyInfo?.websiteLink || "",
      typeof: "link",
    },
    {
      label: t("order_view.primary_market"),
      value:
        (getCompanyInfo && getCompanyInfo?.primaryMarket[0]?.marketname) ||
        "---",
    },
    {
      label: t("order_view.isin"),
      value:
        (getCompanyInfo && getCompanyInfo?.isin) ||
        "---",
    },
    {
      label: t("order_view.symbol"),
      value:
        (getCompanyInfo && getCompanyInfo?.symbol) ||
        "---",
    },
    {
      label: t("order_view.ipo_listing_date"),
      value:
        getCompanyData?.companyInfo?.ipoListingDate.length > 0
          ? dayjs(getCompanyData?.companyInfo?.ipoListingDate).format(
            "MMM DD, YYYY"
          )
          : "---",
    },
  ];

  const ticketDescription = (e) => {
    const result = isCharacterLimitExceeded(
      e,
      appConstants?.charCountLimit?.brandingNotes
    );
    setEnteredCharacter(result?.characterCount);
    setBalanceCharacter(result?.remainingCharacters);
    const limitedText = getLimitedHtmlWithNewlineContent(
      e,
      appConstants?.charCountLimit?.brandingNotes
    );
    setDescription(limitedText);
  };
  /** USED TO HANDLE INPUT FOCUS */
  const handleFocus = (e) => {
    setFocusedFlag(true);
  };

  const fetchCompanyData = async (paramData) => {
    try {
      const response = updateOrderDescription(paramData);
      response.then((res) => {
        if (res?.status) {
          showToast({
            message: res.data,
            variant: "success",
          });
          const response = getTicketDetails({ ticketId: getCompanyData.orderId, boardID: activeBoard?.[0]?.boardID });
          response.then((res) => {
            if (res?.status) {
              dispatch({ type: "SET_TICKET_DETAILS", payload: res.data });
            }
          });
          setShowEditComment(false);
        }
      });
    } catch (error) {
      // Handle errors
      showToast({
        message: error,
        variant: "danger",
      });
    }
  };
  const saveCompanyDescription = () => {
    if (description == companyData?.description) return;
    const param = {
      orderId: companyData.orderId,
      description: description,
    };
    fetchCompanyData(param);
  };

  const cancelCompanyDescription = () => {
    setDescription(companyData?.description || "");
    setShowEditComment(false);
  };

  const showEditDelete = () => {
    setShowEditComment(!showEditComment);
  };

  const CompanyDescription = () => {
    return (
      <>
        <div
          className="commentInfo-details-comments-content"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(companyData?.description, {
              ALLOWED_ATTR: ["href", "target", "src"],
            }),
          }}
        ></div>
        <div className="commentInfo-edit" ref={popref}>
          <button
            className="commentInfo-btn"
            title="Edit Comment"
            onClick={() => showEditDelete("classname")}
          >
            <img src={pencilSimpleLine} alt="pencilSimpleLine" />{" "}
            {t("order_view.edit")}
          </button>
        </div>
      </>
    );
  };

  const setProceedOrder = async (paramData) => {
    try {
      const response = createProcessOrder(paramData);
      response.then((res) => {
        if (res?.status) {
          showToast({
            message: res?.data?.message,
            variant: "success",
          });
          getTicketDetails({ ticketId: paramData, boardID: activeBoard?.[0]?.boardID });
          setCompanyData({ ...getCompanyData, isProcessOrder: true });
          onCompanyDataUpdate({ ...getCompanyData, isProcessOrder: true });
        }
      });
    } catch (error) {
      // Handle errors
      showToast({
        message: error,
        variant: "danger",
      });
    }
  };

  const handleProceedOrder = () => {
    setProceedOrder(getCompanyData?.orderId);
  };
  console.log("getCompanyData", getCompanyData);
  return (
    <Fragment>
      <Row className="w-100 fluid mx-auto d-flex flex-row  p-4">
        {/* this column for  rendering order overView Components rendering */}
        <Col className="d-flex flex-row justify-content-start align-items-center w-100 flex-wrap">
          <Col lg={2} md={2} xs={3}>
            <div className="rounded-circle logo_bg ">
              {getCompanyData?.companyInfo && (
                <LogoAvatarShowLetter
                  genaralData={getCompanyData?.companyInfo}
                  profileName={"companyName"}
                  outerClassName={"logo_bg"}
                  innerClassName={"logo_text"}
                ></LogoAvatarShowLetter>
              )}
            </div>
          </Col>
          <Col xl={10} lg={10} md={12} className="p-3">
            <div className="d-flex flex-row flex-wrap w-100 justify-content-start gap-3 align-items-start my-2">
              <p className="companyName_Text text-wrap p-0 mx-2 m-0">
                {getCompanyData?.companyInfo?.companyName}
              </p>
              <div className="d-flex justify-content-start gap-2 mx-2 mt-2">
                {orderType?.data &&
                  renderOrderType(getCompanyData, orderType?.data, true, true)}
                {getCompanyData?.companyInfo?.isIPO && (
                  <div
                    className={`px-2 rounded py-2 ${"className"}`}
                    style={{
                      backgroundColor: "#FFF",
                      color: "#016859",
                      border: "1px solid #016859",
                      fontWeight: "500",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    {"IPO"}
                  </div>
                )}
              </div>
            </div>
            <Row className="m-0 p-0 d-flex flex-row flex-wrap justify-content-between w-100">
              {LabelValueRender?.map((row, i) => {
                return (
                  <Col md={6} className="d-flex flex-row py-1" key={i}>
                    <Col xs={5} className="p-0">
                      <p className="text-muted p-0 customLabelValueText">
                        {row.label}
                      </p>
                    </Col>
                    <Col xs={7} className="p-0">
                      {row.typeof === "link" && row.value ? (
                        <p className="mx-3 p-0">
                          <a
                            className="btn-link website-link"
                            href={
                              row.value
                                ? `https://${row.value.replace(
                                  /^https?:\/\//,
                                  ""
                                )}`
                                : ""
                            }
                            title={
                              row.value
                                ? `https://${row.value.replace(
                                  /^https?:\/\//,
                                  ""
                                )}`
                                : ""
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {row.value}
                          </a>
                        </p>
                      ) : (
                        <p
                          className="mx-3 customLabelValueText p-0"
                          title={row.value}
                        >
                          {row.value || "---"}
                        </p>
                      )}
                    </Col>
                  </Col>
                );
              })}
            </Row>
          </Col>
          <Col md={12} className="d-flex flex-column py-3 w-100 disabled">
            <div>
              <p className="m-0 mb-2 fs-18 customLabelValueText">
                {t("order_view.description")}
              </p>
              {showEditComment && (
                <>
                  <RichTextEditor
                    toolbarId={"ticket-description"}
                    headTitle="Description"
                    placeholder={t("order_view.enter_description_here")}
                    value={description}
                    handleValueChange={ticketDescription}
                    handleMentionedUsers={(e) => {
                      return null;
                    }}
                    taggableMembers={[]}
                    className={`description_input ${focusedFlag && `focused`}`}
                    onFocus={handleFocus}
                    isVisible={false}
                    disabled={description === companyData?.description}
                    enableMention={false}
                  />
                  {(enteredCharacter !== null ||
                    enteredCharacter?.length > 0) && (
                      <p className="error-msg">
                        <b>
                          {enteredCharacter >
                            appConstants?.charCountLimit?.brandingNotes
                            ? appConstants?.charCountLimit?.brandingNotes
                            : enteredCharacter}
                          /{appConstants?.charCountLimit?.brandingNotes}
                        </b>{" "}
                        {t("ticket.characters_used")}, <b>{balanceCharacter}</b>{" "}
                        {t("ticket.remaining")}
                      </p>
                    )}
                  <div className="cancelSaveButtonSection pb-3 gap-3">
                    <button
                      className="btn btn-light border px-3"
                      onClick={cancelCompanyDescription}
                      tabIndex={0}
                    >
                      {t("order_view.cancel")}
                    </button>
                    <button
                      disabled={description == companyData?.description}
                      className="btn button_save px-3"
                      onClick={saveCompanyDescription}
                    >
                      {t("order_view.save")}{" "}
                    </button>
                  </div>
                </>
              )}
            </div>

            {!showEditComment && (
              <div className="commentInfo-details-comments-box">
                <ShowMoreLessElement
                  initialDivHeight={"120"}
                  gettingElements={<CompanyDescription />}
                  customClass={""}
                  buttonAlign={"right"}
                  noShowMore={false}
                ></ShowMoreLessElement>
              </div>
            )}
          </Col>
          {(getCompanyData?.isProcessOrder == null ||
            !getCompanyData?.isProcessOrder) && (
              <div className="orderButtonContainer">
                <button
                  className="btn btn-0 "
                  disabled={!enableProcess}
                  onClick={handleProceedOrder}
                >
                  {t("order_view.process_order")}
                </button>
              </div>
            )}
        </Col>
      </Row>
    </Fragment>
  );
};

export default OrderInfoView;
