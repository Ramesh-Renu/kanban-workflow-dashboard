import { t } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { EditHeader } from ".";
import AttachmentUpload from "../../../../components/common/AttachmentUpload";
import { getUploadAttachmentFile } from "../../../../services";
import { useToast } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider";

const OrderDocuments = ({ companyData, onEdit, setCanShow }) => {
  const { attachmentData, dispatch } = useGlobalContext();
  const documentData = [
    {
      title: t("order_view.common_attachment"),
      key: "common_attachment",
      isDisabled: false,
      isShow: true,
      values: [
        "OC Document",
        "DPA Agreement",
        "SLA Agreement",
        "Final SLA Agreement-01",
      ],
    },
    {
      title: t("order_view.confidential_attachment"),
      key: "confidential_attachment",
      isDisabled: false,
      isShow: true,
      values: [
        "OC Document",
        "DPA Agreement",
        "SLA Agreement",
        "Final SLA Agreement-01",
      ],
    },
  ];
  const [commonAttachment, setCommonAttachment] = useState([]);
  const [confidentialAttachment, setConfidentialAttachment] = useState([]);
  const isFetchingCommonRef = useRef(false);
  const isFetchingConfidentialRef = useRef(false);
  const { showToast } = useToast();

  const fetchAttachmentFile = async (paramData) => {
    const isCommon = paramData.module === "common_attachment";
    const ref = isCommon ? isFetchingCommonRef : isFetchingConfidentialRef;
    if (ref.current) return;
    try {
      ref.current = true;
      const response = await getUploadAttachmentFile(paramData); // await instead of .then
      if (response?.status) {
        if (paramData.module === "common_attachment") {
          setCommonAttachment(response.data);
          dispatch({ type: "SET_ATTACHMENT_DATA", payload: response.data });
          dispatch({
            type: "SET_ATTACHMENT_ORDERID",
            payload: companyData?.orderId,
          });
        } else {
          setConfidentialAttachment(response.data);
          dispatch({ type: "SET_CONFIDENTIAL_DATA", payload: response.data });
          dispatch({
            type: "SET_ATTACHMENT_ORDERID",
            payload: companyData?.orderId,
          });
        }
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to fetch attachments.",
        variant: "danger",
      });
    } finally {
      ref.current = false;
    }
  };

  useEffect(() => {
    const commonParamData = {
      module: "common_attachment",
      referenceId: companyData?.orderId,
    };
    const confidentialParamData = {
      module: "confidential_attachment",
      referenceId: companyData?.orderId,
    };
    if (attachmentData.orderId == null && attachmentData?.data?.length === 0) {
      fetchAttachmentFile(commonParamData);
    } else {
      setCommonAttachment(attachmentData.data);
    }
    if (attachmentData.orderId == null && attachmentData?.data?.length === 0) {
      fetchAttachmentFile(confidentialParamData);
    } else {
      setConfidentialAttachment(attachmentData.confidentialData);
    }
  }, []);

  const myStyles = {
    width: "30%",
  };

  return (
    <div className="documentsContainer brandingGuideLines px-0 ">
      {documentData
        .filter((item) => setCanShow?.includes(item.key) || item.key === "common_attachment") // filter out items first
        .map((item, index) => (
          <div className="bg-white rounded shadow-sm mt-3" key={index}>
            <Row className="headerSection mx-auto align-items-center px-3 py-2 d-flex flex-row justify-content-between">
              <Col className="m-0 p-0">
                <p className="m-0 documentTitle">{item.title}</p>
              </Col>
              <Col className="m-0 p-0 text-end">
                <EditHeader onEdit={onEdit}></EditHeader>
              </Col>
            </Row>
            <hr className="w-100 m-0 p-0 " />
            <Row className="m-0 p-0">
              <AttachmentUpload
                heading=""
                moduleName={
                  item.title == "Common Attachment"
                    ? "common_attachment"
                    : "confidential_attachment"
                }
                referenceId={companyData}
                headingSize={"s"} //s, m, l, xl
                isAccessDelete={false}
                isAccessUpload={false}
                fetchAttachmentFile={fetchAttachmentFile}
                getAttachmentFile={
                  item.title == "Common Attachment"
                    ? commonAttachment
                    : confidentialAttachment
                }
                customStyles={myStyles}
              ></AttachmentUpload>
              {item.title == "Common Attachment" &&
                commonAttachment?.length === 0 && (
                  <p className="text-center my-4">Attachment not available</p>
                )}
              {item.title == "Confidential Attachment" &&
                confidentialAttachment?.length === 0 && (
                  <p className="text-center my-4">Attachment not available</p>
                )}
            </Row>
          </div>
        ))}
    </div>
  );
};

export default OrderDocuments;
