import React from "react";
import ReactQuill, { Quill } from "react-quill";
import QuillMention from "quill-mention";
import "react-quill/dist/quill.snow.css";
import LogoAvatarShowLetter from "../LogoAvatarShowLetter";
import Delta from "quill-delta";
import ReactDOM from 'react-dom/client';
Quill.register("modules/mentions", QuillMention);

/** CLEAR FORMAT OF TEXT WHEN USER TRY TO COPY PASTE THE PREVIOUS CONTENT */
const Clipboard = ReactQuill.Quill.import("modules/clipboard");
export class ClearFormatClipboard extends Clipboard {
  onPaste(e) {
    e.preventDefault();
    const range = this.quill.getSelection();
    const clipboardData = e.clipboardData || window.clipboardData;
    const types = Array.from(e.clipboardData.types);
    
    // Check if there are files (images) in the clipboard
    if (types.includes('Files')) {
      const files = Array.from(clipboardData.files);
      files.forEach(file => {
        // Handle pasting of image file
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = event => {
            const delta = new Delta()
              .retain(range.index)
              .insert({ image: event.target.result });
            this.quill.updateContents(delta, 'user');
          };
          reader.readAsDataURL(file);
        }
      });
    } else if (types.includes('text/plain')) {
      // Handle plain text pasting
      const text = clipboardData.getData('text/plain');
      const itemsToPaste = text.split('\r\n').filter(item => item);

      /*const mentionRegex = /@(\w+)/g;
      if (mentionRegex.test(text)) {
        // Remove color format from mentions
        const newText = text.replace(/<span[^>]*style="[^"]*color:\s*[^"]*"[^>]*>([^<]*)<\/span>/g, '$1');
        const delta = new Delta()
          .retain(range.index)
          .delete(range.length)
          .insert(newText);
        this.quill.updateContents(delta, 'user');
      } else {*/
        const urlRegex = /(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi;
        const urls = text.match(urlRegex);        
        
        if (urls && urls.length > 0) {       
          // Use a Delta to update the content with links
          const delta = new Delta().retain(range.index).delete(range.length);
          let remainingText = text;
          let currentIndex = 0;
          
          urls.forEach(url => {
            const urlIndex = remainingText.indexOf(url, currentIndex);
    
            if (urlIndex > currentIndex) {
              delta.insert(remainingText.slice(currentIndex, urlIndex));
            }
            // delta.insert(url, { link: url });
            delta.insert(url, { link: url, target: "_blank" });
            currentIndex = urlIndex + url.length;
          });
    
          if (currentIndex < remainingText.length) {
            delta.insert(remainingText.slice(currentIndex));
          }
    
          this.quill.updateContents(delta, 'user');
          this.quill.setSelection(range.index + text.length, 0);
        }else{
          // No mentions, paste the exact format copied
          const delta = new Delta().retain(range.index).delete(range.length);
          delta.insert(text);

          this.quill.updateContents(delta, 'user');
          this.quill.setSelection(range.index + text.length, 0);
        }        
      // }
    } else if (types.includes('text/html')) {
      // Allow all other formats to be pasted as is
      const text = clipboardData.getData('text/html');
      const delta = new Delta()
        .retain(range.index)
        .insert(text);
      this.quill.updateContents(delta, 'user');
      this.quill.setSelection(range.index + text.length, 0);
    } 
    /*else if (types.includes('text/uri-list')) {
      const url = clipboardData.getData('text/uri-list');
      const delta = new Delta()
        .retain(range.index)
        .insert({ link: url });
      this.quill.updateContents(delta, 'user');
    } */
  }
}
ReactQuill.Quill.register("modules/clipboard", ClearFormatClipboard, true);

// Custom Undo button icon component for Quill editor. You can import it directly
// from 'quill/assets/icons/undo.svg' but number of loaders do not
// handle them correctly
const CustomUndo = () => (
  <svg viewBox="0 0 18 18">
    <polygon className="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10" />
    <path
      className="ql-stroke"
      d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"
    />
  </svg>
);

// Redo button icon component for Quill editor
const CustomRedo = () => (
  <svg viewBox="0 0 18 18">
    <polygon className="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10" />
    <path
      className="ql-stroke"
      d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"
    />
  </svg>
);

// Undo and redo functions for Custom Toolbar
function undoChange() {
  this.quill.history.undo();
}
function redoChange() {
  this.quill.history.redo();
}

// Add sizes to whitelist and register them
const Size = ReactQuill.Quill.import("formats/size");
Size.whitelist = ["extra-small", "small", "medium", "large"];
ReactQuill.Quill.register(Size, true);

// Add fonts to whitelist and register them
const Font = ReactQuill.Quill.import("formats/font");
Font.whitelist = [
  "arial",
  "comic-sans",
  "courier-new",
  "georgia",
  "helvetica",
  "lucida"
];
ReactQuill.Quill.register(Font, true);

/** FUNCTION GETS TRIGGERED WHEN USER ENTER @ VALUE AND DISPLAYS RELEVANT USER LIST  */
let atValues = [];
export const CallSource = (searchTerm, renderList, mentionChar) => {

  /** USED TO GET ALL REGISTERED USERS LISTS */
  // if(atValues.length === 0){
  //   getAllMembers().then((res) => {
  //     if (res.status) {
  //       atValues = res.data.map(item => ({
  //         id: item.regId,
  //         value: item.givenName,
  //         photo: item.photo
  //       }));
  //     }
  //   });  
  // }
  
  let values;
  if (mentionChar === "@") {
    // values = atValues;
    values = atValues.concat([{ id: 'All', value: 'All', photo: null }]);
  }
  if (searchTerm.length === 0) {
    renderList(values, searchTerm);
  } else {
    const matches = [];
    if (values.length > 0) {
      for (let i = 0; i < values.length; i++)
        if (~values[i].value.toLowerCase().indexOf(searchTerm.toLowerCase()))
          matches.push(values[i]);
      renderList(matches, searchTerm);
    }
  }
};

/** USED TO HANDLE MENTION SELECTION VALUES */
export let mentionedUsers = [];
function handleMentionSelect (item) {
  const editor = this.quill;
  const range = editor.getSelection(true); // Get current selection
  const mentionText = `@${item.value} `;
  // const mentionText = `<span className="mention" data-id="${item.id}" data-value="${item.value}" data-photo="${item.photo}">@${item.value}</span> `;

  const content = editor.getText();
  let mentionStartAt = 0;
  let lengthToBeDeleted = 0;
  for (let i = range.index - 1; i >= 0; --i) {
    const char = content[i];
    if (char == '@') {
      mentionStartAt = i;
      lengthToBeDeleted += 1;
      break;
    } else {
      lengthToBeDeleted += 1;
    }
  }
  if (item.value == 'all') {
    // Add all users to the mentioned users array
    mentionedUsers = atValues.map(user => user.id);
    // mentionedUsers = atValues.filter(res => res.is_participant === true).map(user => user.id);
  }

  // editor.insertText(range.index, mentionText, {}, { id: item.id, value: item.value, photo: item.photo });
  editor.insertText(range.index, mentionText, {id: item.id, value: item.value, color: '#00ADF0', padding: '2px', 'border-radius': '10px'});
  // editor.insertText(range.index, mentionText, {
  //   link: `${window.location.href}/#/`,//`${window.location.origin}/teams/allmembers/userprofile/${item.id}`,
  //   id: item.id,
  //   value: item.value,
  //   color: '#00ADF0',
  //   onClick: (event) => {
  //     event.preventDefault();
  //   }
  // });
  editor.deleteText(mentionStartAt, lengthToBeDeleted);
  // editor.format("background", "unset");
  editor.format("color", "unset");
  // editor.format("padding", "unset");
  // editor.format("border-radius", "unset");
  // editor.insertEmbed(range.index, 'mention', { id: item.id, value: item.value, photo: item.photo });
  
  // if (!mentionedUsers.includes(item.id)) {
    mentionedUsers = [...mentionedUsers, item.id];
  // }
  // editor.formatText(range.index, mentionText.length, 'color', 'red');
  editor.setSelection(range.index + mentionText.length);
}

/** MENTION DROPDOWN CUSTOM DESIGN */
const renderItem = (item) => {
  const recraftedVal = { id: item.id, value: item.value, photo: item.photo };
  const listItem = document.createElement('span');
  listItem.setAttribute('data-id', recraftedVal.id);
  listItem.classList.add('mention-item');

  const avatarContainer = document.createElement('span');
  const root = ReactDOM.createRoot(avatarContainer);
  root.render(
    <LogoAvatarShowLetter 
      key={recraftedVal.id} // Add key prop here
      genaralData={recraftedVal} 
      profileName={"value"} 
      outerClassName={"profile-image"} 
      innerClassName={"userNull-image"} 
    />
  );
  listItem.appendChild(avatarContainer);

  const username = document.createElement('span');
  username.classList.add('mention-username');
  username.textContent = recraftedVal.value;
  listItem.appendChild(username);

  return listItem;
};


// Modules object for setting up the Quill editor
export const modules = ({ val, self, activeTaggableMembers, enableMention }) => {
  // SET ACTIVE TAGGABLE MEMBERS ON atValues VARIABLE 
  if(activeTaggableMembers?.length > 0){
    atValues = activeTaggableMembers?.map(item => ({
      id: item.regId,
      value: item.displayName,
      photo: item.photo
    })).sort((a, b) => a.value?.localeCompare(b.value));
  }

  const baseModules = {
    toolbar: {
      container: `#toolbar${val ? `-${val}` : ''}`,
      handlers: {
        undo: undoChange,
        redo: redoChange
      }
    },
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true
    }
  };

  // IF enableMention = false → DO NOT ADD mention module
  if (!enableMention) return baseModules;

  // enable @ mentions normally
  return {
    ...baseModules,
    mention: {
      allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
      mentionDenotationChars: ['@'],
      source: CallSource,
      dataAttributes: ['id'],
      onSelect: handleMentionSelect,
      renderItem: renderItem,
      selectKeys: [13, 9],
    }
  };
};

// Formats objects for setting up the Quill editor
export const formats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "align",
  "strike",
  "script",
  "blockquote",
  "background",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "video",
  "color",
  "code-block"
];

/** Branding section notes — text formatting only; images allowed via paste. */
export const brandingNotesFormats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "image",
];

// Quill Toolbar component
export const QuillToolbar = ({
  toolbarId,
  headTitle,
  handleFileUpload,
  isVisible,
  isCustomIcon,
  customIconFile,
  hideMediaTools = false,
}) => {
  const toolStyle = {
    display: isVisible ? "block" :'none',
  }
  if(!isVisible){
    mentionedUsers = [];
  }
  return (
    <div id={`toolbar${toolbarId ? `-${toolbarId}` : ''}`} style={toolStyle}>
      
      {headTitle && <p className="ql-title">{headTitle}</p>}
      <div className="ql-options">
          <span className="ql-formats">
              <button className="ql-undo" title="Undo typing">
                  <CustomUndo />
              </button>
              <button className="ql-redo" title="Repeat typing">
                  <CustomRedo />
              </button>
          </span>
          <span className="ql-formats">
              <button className="ql-bold" title="Bold"/>
              <button className="ql-italic" title="Italic"/>
              <button className="ql-strike" title="Strikethrough"/>
              <button className="ql-underline" title="Underline"/>
          </span>
          <span className="ql-formats">
              <button className="ql-list" value="ordered" title="Numbered list"/>
              <button className="ql-list" value="bullet" title="Bulleted list"/>
              {/* <button className="ql-list" value="check" title="Checkbox list"/> */}
          </span>
          {/* <span className="ql-formats">
              <button className="ql-indent" value="-1" />
              <button className="ql-indent" value="+1" />
          </span> */}
          {/* <span className="ql-formats">
              <select className="ql-align" />
              <select className="ql-color" />
              <select className="ql-background" />
          </span> */}
          {!hideMediaTools && toolbarId !== "ticket-description" && (
              <span className="ql-formats">
                  <button className="ql-link" title="Insert link"/>
                  <button className="ql-video" title="Insert video link"/>
                  <button className="ql-image" title="Insert image"/>
                  <button className={`${isCustomIcon ? customIconFile: "icon-attachment"}`} type="file" onClick={handleFileUpload} title="Upload files"></button>
              </span>
            )}                
      </div>
      
    </div>
  )
};

export default QuillToolbar;
