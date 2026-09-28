/** This component created by Ramesh R ***/
import React, { Fragment, useEffect, useState } from "react";
import { classNames } from "@euroland/libs";
import { colorCodeCardName } from "../../constant/ColorCodes";

const LogoAvatarShowLetter = ({
  genaralData,
  profilePhotoName,
  profileName,
  outerClassName,
  innerClassName,
  index,
  showTitle = false,
  isCustomBg = false,
  isActive = false,
  firsNameShow = false,
}) => {
  const [photoImageFailed, setPhotoImageFailed] = useState(false);
  const [logoImageFailed, setLogoImageFailed] = useState(false);

  const cleanedName = genaralData[profileName]
    ?.replace(/[^a-zA-Z\s]/g, "") // remove numbers and special chars
    ?.replace(/\s+/g, " ") // normalize multiple spaces
    ?.trim();

  const temp = colorCodeCardName?.filter(
    (c) => c?.name === cleanedName?.slice(0, 1)?.toLowerCase(),
  )[0];

  const userName = cleanedName?.split(" ");

  const genaralDataPhoto = profilePhotoName
    ? genaralData?.[profilePhotoName] ||
      genaralData?.photo ||
      genaralData?.photoUrl
    : genaralData?.photo || genaralData?.photoUrl;

  let initials;
  if (userName?.length === 1) {
    initials = userName[0]?.slice(0, 2)?.toUpperCase();
  } else {
    initials = userName
      ?.slice(0, 2)
      ?.map((name) => name?.slice(0, 1))
      ?.join("")
      ?.toUpperCase();
  }

  const avatarBackgroundColor =
    isCustomBg === false ? (temp ? temp.color : colorCodeCardName[1].color) : undefined;

  useEffect(() => {
    setPhotoImageFailed(false);
    setLogoImageFailed(false);
  }, [genaralDataPhoto, genaralData?.logo]);

  const renderInitialsAvatar = (ariaLabel, wrapWithOuter = true) => {
    const initialsContent = (
      <span
        className={innerClassName ? innerClassName : ""}
        title={genaralData[profileName]}
        aria-label={ariaLabel}
      >
        {initials || "NA"}
      </span>
    );

    if (!wrapWithOuter) {
      return (
        <div style={{ backgroundColor: avatarBackgroundColor }}>{initialsContent}</div>
      );
    }

    return (
      <div
        className={outerClassName ? outerClassName : ""}
        style={{ backgroundColor: avatarBackgroundColor }}
        key={index ? index : "1"}
        id={index ? index : "1"}
      >
        {initialsContent}
      </div>
    );
  };
  const userIcon = {
    // position: "relative",
    width: "100%",
    height: "100%",
    display: "block",
  };
  const userIconHead = {
    minWith: "6px",
    width: "30%",
    height: "25%",
    background: "#ffffff",
    borderRadius: "50%",
    position: "absolute",
    top: "20%",
    left: "35%",
  };
  const userIconBody = {
    minWith: "15px",
    width: "70%",
    height: "25%",
    background: "#ffffff",
    borderRadius: "50%/100% 100% 0 0",
    position: "absolute",
    bottom: "20%",
    left: "15%",
  };
  return (
    <Fragment>
      {genaralData?.logo &&
        (genaralDataPhoto !== undefined || genaralDataPhoto !== null) && (
          <div
            className={outerClassName ? outerClassName : ""}
            key={index ? index : "1"}
            id={index ? index : "1"}
            title={showTitle ? genaralData[profileName] : undefined}
          >
            {genaralData?.logo && !logoImageFailed && (
              <img
                src={genaralData?.logo}
                alt="logo"
                className={innerClassName ? innerClassName : ""}
                title={genaralData[profileName]}
                onError={() => setLogoImageFailed(true)}
              />
            )}
            {genaralData?.logo &&
              logoImageFailed &&
              renderInitialsAvatar("Logo fallback initials", false)}
            {genaralData?.userStatus && (
              <span
                className={`${
                  "user-profile__image__status icon-" +
                  `${
                    genaralData.userStatus === "active"
                      ? "online"
                      : genaralData?.userStatus === "busy"
                        ? "busy"
                        : "away"
                  }`
                }`}
              >
                {" "}
                <b>
                  {" "}
                  {genaralData?.userStatus === "active"
                    ? "Online"
                    : genaralData?.userStatus === "busy"
                      ? "Busy"
                      : "Away"}{" "}
                </b>
              </span>
            )}
          </div>
        )}
      {genaralDataPhoto && genaralData?.logo !== null && (
        <>
          <div
            className={classNames(
              outerClassName ? outerClassName : "",
              firsNameShow ? "first-name-show-container" : "",
            )}
            key={index ? index : "1"}
            id={index ? index : "1"}
            title={showTitle ? genaralData[profileName] : undefined}
          >
            {genaralDataPhoto && genaralDataPhoto.length > 0 && !photoImageFailed && (
              <img
                // src={`data:image/png;base64,${genaralDataPhoto}`}
                src={genaralDataPhoto}
                alt="userImage"
                className={innerClassName ? innerClassName : ""}
                title={showTitle ? showTitle : genaralData[profileName]}
                onError={() => setPhotoImageFailed(true)}
              />
            )}
            {(genaralDataPhoto.length === 0 || photoImageFailed) &&
              renderInitialsAvatar(
                photoImageFailed ? "Broken image fallback" : "No photo",
              )}
            {genaralData?.userStatus && (
              <span
                className={`${
                  "user-profile__image__status icon-" +
                  `${
                    genaralData.userStatus === "active"
                      ? "online"
                      : genaralData?.userStatus === "busy"
                        ? "busy"
                        : "away"
                  }`
                }`}
              >
                {" "}
                <b>
                  {" "}
                  {genaralData?.userStatus === "active"
                    ? "Online"
                    : genaralData?.userStatus === "busy"
                      ? "Busy"
                      : "Away"}{" "}
                </b>
              </span>
            )}
          </div>
          {firsNameShow && (
            <span className="first-name-show" title={genaralData[profileName]}>
              {genaralData[profileName]}
            </span>
          )}
        </>
      )}
      {((genaralData?.logo == null &&
        (genaralDataPhoto == null || genaralDataPhoto === "")) ||
        (genaralDataPhoto == null && genaralData?.logo !== undefined)) && (
        <div
          className={outerClassName ? outerClassName : ""}
          style={{
            backgroundColor: avatarBackgroundColor,
          }}
          key={index ? index : "1"}
          id={index ? index : "1"}
          title={showTitle ? genaralData[profileName] : undefined}
        >
          {initials && (
            <span
              className={innerClassName ? innerClassName : ""}
              title={genaralData[profileName]}
            >
              {initials}
            </span>
          )}
          {!initials && (
            <div
              className={"no-image-name"}
              title={"No Image/Name"}
              style={{ position: "relative", width: "100%" }}
            >
              <div style={userIcon}>
                <div style={userIconHead}></div>
                <div style={userIconBody}></div>
              </div>
            </div>
          )}
          {genaralData?.userStatus && (
            <span
              className={classNames(
                "user-profile__image__status",
                `icon-` + genaralData?.userStatus,
              )}
            ></span>
          )}
        </div>
      )}
    </Fragment>
  );
};

export default LogoAvatarShowLetter;
