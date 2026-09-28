import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import QuillToolbar, {
  modules,
  formats,
  brandingNotesFormats,
  mentionedUsers,
} from "./EditorToolbar";
import appConstants from "../../../constant/common";
import { useToast } from "@orion/shared";
import { isValidFileSelection } from "../../../utils/common";
const RichTextEditor = ({
  toolbarId,
  handleValueChange,
  handleAttachmentUpdate,
  handleDeletedAttachment,
  handleMentionedUsers,
  hideMediaTools = false,
  ...props
}) => {
  const inputRef = useRef(null);
  const { showToast } = useToast();
  const [attachedFiles, setAttachedFiles] = useState([]);
  const quillRef = useRef(null);
  const [mentionedUsersId, setMentionedUsersId] = useState([]);

  const onEditorChange = (content, delta, source, editor) => {
    if (hideMediaTools && source !== "user") return;
    handleValueChange?.(content, delta, source, editor);
  };

  const handleFileUpload = () => {
    inputRef.current.value = null; // Clear the file input
    inputRef.current.click();
  };

  const handleSelectFiles = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files); // Convert FileList to Array

      const result = isValidFileSelection(
        filesArray,
        appConstants?.restrictedFileTypes,
        50
      );

      if (!result.isValid) {
        showToast({
          message: result.reason,
          variant: "danger",
          showTime: 5000,
        });
      } else {
        handleAttachmentUpdate(result.data); // Pass array to parent
      }
    }
  };

  useEffect(() => {
    setAttachedFiles(props.attachmentValue);
  }, [props.attachmentValue]);

  // Function to handle attachment deletion
  const handleDeleteAttachment = (attachment) => {
    // setAttachedFiles(prevAttachments => prevAttachments.filter(file => file.name !== attachment.name));
    const updatedAttachedFiles = attachedFiles?.filter((file) => {
      if (attachment.name) {
        return file.name !== attachment.name;
      } else {
        return true;
      }
    });
    setAttachedFiles(
      updatedAttachedFiles?.length > 0 ? updatedAttachedFiles : []
    );
    handleAttachmentUpdate(
      updatedAttachedFiles?.length > 0 ? updatedAttachedFiles : []
    );
    handleDeletedAttachment(attachment);
  };

  useEffect(() => {
    // handleMentionedUsers(mentionedUsers);
    if (props?.isVisible) {
      setMentionedUsersId(mentionedUsers);
    }
  }, [mentionedUsers]);

  /** FINAL MENTIONED USERS ID */
  useEffect(() => {
    // if(mentionedUsersId.length > 0){
    handleMentionedUsers(findMentionedUsers(mentionedUsersId));
    // }
  }, [mentionedUsersId]);

  /** USED TO FIND MENTIONED USER REGIDS */
  function findMentionedUsers(usersId) {
    //Check once again for correct mentioned user or not
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return [];
    const text = quill.getText();
    const mentionedUserIds = [];

    // Regular expression to match mentions like "@username"
    const mentionRegex = /@(\w+)/g;

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // Extract the username from the match
      const username = match[1];

      // UPDATE ALL USERS REGID ON MENTIONED
      if (username.toLowerCase() === "all" && props.enableMention) {
        // props.taggableMembers.map((e)=> {
        //     // mentionedUserIds.push(e.reg_id);
        //     if(e.is_participant){
        //         mentionedUserIds.push(e.reg_id);
        //     }
        // })
        props.ticketParticipants.map((e) => {
          mentionedUserIds.push(e.regId);
        });
      } else {
        // Find the user with the matching username in the registeredUsers array
        // const user = props.taggableMembers.find(user => user.given_name.toLowerCase() === username.toLowerCase());

        // If a matching user is found, add their regId to the mentionedUserIds array
        // if (user) {
        mentionedUserIds.push(...new Set(usersId.filter((id) => id !== "All")));
        // }
      }
    }
    return mentionedUserIds;
  }

  /** USED TO UPDATE MENTIONED USER IDS - WHEN USER PERFORM ANY TEXT CHANGE */
  useEffect(() => {
    if (!props?.taggableMembers) return;
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;

    const onTextChange = function (delta, oldDelta, source) {
        if (source === "user" && delta.ops.length > 0) {
          setMentionedUsersId([]);
          // Iterate through the delta operations
          delta.ops.forEach((op) => {
            // Check if the operation is a delete operation
            if (op.hasOwnProperty("delete")) {
              const deletedText = quill.getText(op.delete);

              const mentionRegex = /@(\w+)/g;
              let match;
              // Find all mention IDs in the deleted text
              while ((match = mentionRegex.exec(deletedText)) !== null) {
                // Extract the ID of the mentioned user
                const mentionVal = match[1];

                // REMOVE ALL USERS REGID ON MENTIONED
                if (mentionVal.toLowerCase() === "all" && props.enableMention) {
                  setMentionedUsersId([]);
                } else {
                  // Handle the deletion of the mention with the extracted ID
                  for (let i = 0; i < props.taggableMembers.length; i++)
                    if (
                      ~props.taggableMembers[i].displayName
                        .toLowerCase()
                        .indexOf(mentionVal.toLowerCase())
                    ) {
                      if (
                        props.taggableMembers[i].displayName.toLowerCase() ===
                        mentionVal.toLowerCase()
                      ) {
                        setMentionedUsersId((prev) => [
                          ...prev,
                          ...mentionedUsers.filter(
                            (id) => id == props.taggableMembers[i].regId
                          ),
                        ]);
                      }
                    }
                }
              }
            }
          });
        }
    };

    quill.on("text-change", onTextChange);
    return () => {
      quill.off("text-change", onTextChange);
    };
  }, [props?.taggableMembers, props.enableMention, props.ticketParticipants]);

  useEffect(() => {
    setMentionedUsersId([]);
    handleMentionedUsers([]);
  }, [!props.isVisible]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    const content = quill.getContents(); // Get the contents of the editor

    // Reset Mention Ids
    setMentionedUsersId([]);

    // Iterate through the content
    content.ops.forEach((op) => {
      if (!op.insert.image && !op.insert.video) {
        // let match = (op.insert).match(/@\w+\s\w+/g);
        // let match = op.insert.match(/@\w+(\s+\w+)+/g);
        let match = op.insert.match(/@[A-Za-z0-9._-]+(?:\s[A-Za-z0-9._-]+)*/g);

        if (match?.length > 0 && props.enableMention) {
          match.map((mention, index) => {
            const mentionWithoutAt = mention.slice(1).toLowerCase();
            const isAllMention = mentionWithoutAt === "all";
            if (isAllMention) {
              const allUserIds = props?.ticketParticipants.map(
                (member) => member.regId
              );
              setMentionedUsersId((prev) => [...prev, ...allUserIds]);
            } else {
              const matchingMember = props.taggableMembers.find(
                (member) =>
                  member.displayName.trim().toLowerCase() === mentionWithoutAt
              );

              if (matchingMember) {
                setMentionedUsersId((prev) => [...prev, matchingMember.regId]);
              }
            }

            // console.log(mention.slice(1), props.taggableMembers)
            // if(mention.slice(1).toLowerCase() === "all"){
            //     for (let i = 0; i < props.taggableMembers.length; i++)
            //         setMentionedUsersId(prev => [
            //             ...prev,
            //             props.taggableMembers[i].reg_id
            //         ]);
            // }else{
            //     for (let i = 0; i < props.taggableMembers.length; i++)
            //         if (~props.taggableMembers[i].display_name.toLowerCase().indexOf(mention.slice(1).toLowerCase())){
            //             if (props.taggableMembers[i].display_name.toLowerCase() === mention.slice(1).toLowerCase()) {
            //                 setMentionedUsersId(prev => [
            //                     ...prev,
            //                     ...mentionedUsers.filter(id => id == props.taggableMembers[i].reg_id)
            //                 ]);
            //             }
            //         }
            // }
          });
        }
      }
    });
  }, [props.value, props.enableMention, props.taggableMembers, props.ticketParticipants]);

  /** CLEAR HISTORY WHEN CLASSNAME CHANGES */
  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      quill.history.clear();
    }
  }, [props.className]);

  return (
    <div
      className={`${
        attachedFiles?.length > 0 ? `attachmentExist` : `defaultExist`
      }`}
    >
      <input
        hidden
        ref={inputRef}
        type="file"
        multiple={true}
        onChange={handleSelectFiles}
      />
        <ReactQuill
          ref={quillRef}
          modules={modules({
            val: toolbarId,
            self: this,
            activeTaggableMembers: props.taggableMembers,
            enableMention: props.enableMention,
          })}
          formats={hideMediaTools ? brandingNotesFormats : formats}
          placeholder={props.placeholder}
          value={props.value}
          onChange={onEditorChange}
          isVisible={props.isVisible}
          {...props}
        />
      
      {attachedFiles && attachedFiles?.length > 0 && (
        <div className="comment-attachment">
          <span className="comment-attachment-title">Uploads :</span>
          {attachedFiles.map((attachment, index) => (
            <span key={index} className="comment-attachment-data">
              <span className="name">{attachment.name}</span>
              <span
                className="icon-failure-cross"
                onClick={() => handleDeleteAttachment(attachment)}
              >
                <span className="path1"></span>
                <span className="path2"></span>
              </span>
            </span>
          ))}
        </div>
      )}
      <QuillToolbar
        toolbarId={toolbarId}
        headTitle={props.headTitle}
        handleFileUpload={handleFileUpload}
        isVisible={props.isVisible}
        hideMediaTools={hideMediaTools}
      />
    </div>
  );
};

export default RichTextEditor;
