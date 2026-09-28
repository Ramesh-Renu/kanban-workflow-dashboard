import AttachmentUpload from "../../../../components/common/AttachmentUpload";
import { useEffect, useRef, useState } from "react";
import { getUploadAttachmentFile } from "../../../../services";
import { useToast } from "@orion/shared";
import { useGlobalContext } from "store/context/GlobalProvider";

const DocumentsContainer = ({ ...props }) => {
  const { dispatch } = useGlobalContext();
  const [commonAttachment, setCommonAttachment] = useState([]);
  const [confidentialAttachment, setConfidentialAttachment] = useState([]);
  const isFetchingCommonRef = useRef(false);
  const isFetchingConfidentialRef = useRef(false);
  const { showToast } = useToast();
  const saved = localStorage.getItem("workspaceState");
  const parsed = JSON.parse(saved);
  const { activeWorkSpace, activeBoard } = parsed || {};
  const activeBoardCode = activeBoard?.[0]?.code;

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
            payload: props?.formData?.orderId,
          });
        } else {
          setConfidentialAttachment(response.data);
          dispatch({ type: "SET_CONFIDENTIAL_DATA", payload: response.data });
          dispatch({
            type: "SET_ATTACHMENT_ORDERID",
            payload: props?.formData?.orderId,
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
      referenceId: props?.formData?.orderId,
    };
    const confidentialParamData = {
      module: "confidential_attachment",
      referenceId: props?.formData?.orderId,
    };
    if (props?.formData?.orderId && commonAttachment.length === 0) {
      fetchAttachmentFile(commonParamData);
    }
    if (props?.formData?.orderId && confidentialAttachment.length === 0) {
      fetchAttachmentFile(confidentialParamData);
    }
  }, []);

  return (
    <div className="documentsContainer">
      <h2 className="documentsContainer--head">Documents</h2>
      <h6 className="documentsContainer--subHead">
        Manage and upload documents
      </h6>
      {commonAttachment && (
        <AttachmentUpload
          heading="Common Attachment"
          moduleName={"common_attachment"}
          referenceId={props.formData}
          headingSize={"l"} //s, m, l, xl
          isAccessDelete={true}
          isAccessUpload={true}
          fetchAttachmentFile={fetchAttachmentFile}
          getAttachmentFile={commonAttachment}
          cols={{ lg: 4, md: 8, xs: 10 }}
          displayFlex={"flex-row"}
        ></AttachmentUpload>
      )}
      {confidentialAttachment && activeBoardCode === "SA" && (
        <AttachmentUpload
          heading="Confidential Attachment"
          moduleName={"confidential_attachment"}
          referenceId={props.formData}
          headingSize={"l"} //s, m, l, xl
          isAccessDelete={true}
          isAccessUpload={true}
          fetchAttachmentFile={fetchAttachmentFile}
          getAttachmentFile={confidentialAttachment}
          cols={{ lg: 4, md: 8, xs: 10 }}
          displayFlex={"flex-row"}
        ></AttachmentUpload>
      )}
    </div>
  );
};

export default DocumentsContainer;
