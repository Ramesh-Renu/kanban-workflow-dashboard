import WorkspaceCardSkeleton from "components/common/skeletons/WorkspaceCardSkeleton";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";
import {
  listInActive,
  gridView,
  closeIcon,
  boardExpandIcon,
} from "../../../assets/images";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Table from "../../../components/common/Table";
import {
  getTrendIcon,
  hexToRgba,
  COLORS_VALUES,
  HEALTH_CONFIG,
  buildWorkspaceSparklineSeries,
  DASHBOARD_ROUTES,
  safeParseLocalStorage,
  isDashboardAdmin,
  isAdminMyWorkspaceMode,
  getScopedBoardIds,
  persistDashboardBoardSelection,
  getAccessibleDashboardBoards,
} from "../../../utils/dashboard";
import TrendingDown from "./Icons/TrendingDown";
import TrendingUp from "./Icons/TrendingUp";
import WorkspaceTrendSparkline from "./WorkspaceTrendSparkline";
import { useNavigate } from "react-router-dom";
import Bookmarked from "./Icons/Bookmarked";
import useAuth from "../../../hooks/useAuth";
import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import UpArrow from "./Icons/UpArrow";
import DownArrow from "./Icons/DownArrow";
import ExportUploadIcon from "./Icons/ExportUploadIcon";

const getMetricTrendColor = (
  trend,
  { isOverdue = false, dashboardMaterValue = [] } = {},
) => {
  const colors = COLORS_VALUES(dashboardMaterValue);
  if (!trend || trend === "Ideal") return "#666666";

  const trendColorMap = isOverdue
    ? { Increase: colors.atRisk, Decrease: colors.healthy }
    : { Increase: colors.healthy, Decrease: colors.atRisk };

  return trendColorMap[trend] || "#666666";
};

export const getActiveBoardProgress = (trend, isOverdue, dashboardMaterValue = []) => ({
  overdue: getMetricTrendColor(trend, { isOverdue, dashboardMaterValue }) || "#E11D48",
  completion: getMetricTrendColor(trend, { isOverdue, dashboardMaterValue }) || "#22C55E",
});

const getBoardAssignee = (item) => {
  const raw =
    item?.leadInfo ??
    item?.assignee ??
    item?.leadUser ??
    item?.boardLead ??
    item?.assigneeName ??
    item?.user_Info?.[0] ??
    null;

  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
};

const getAssigneeDisplayName = (assignee) => {
  if (!assignee) return "Unassigned";
  return assignee.displayName ?? assignee.name ?? assignee.userName ?? "Unassigned";
};

const normalizeBoardAssignee = (assignee) => {
  if (!assignee) return null;
  const displayName = getAssigneeDisplayName(assignee);
  return {
    ...assignee,
    displayName,
    name: assignee.name ?? displayName,
  };
};

const ActiveBoardsHeaderArt = () => (
  <div className="workspace-widget__active-boards-header-art">
    <svg
      width="117"
      height="83"
      viewBox="0 0 117 83"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_9167_31933)">
        <path
          d="M5.09375 2.16522C5.09375 0.796815 6.20307 -0.3125 7.57147 -0.3125H27.5269C28.8953 -0.3125 30.0046 0.796815 30.0046 2.16522V9.16522H5.09375V2.16522Z"
          fill="#16B87F"
        />
        <path
          d="M10.374 5.92578V2.89057H11.5664C11.7775 2.89057 11.9538 2.92381 12.0954 2.9903C12.24 3.05678 12.3484 3.14928 12.4206 3.2678C12.4958 3.38343 12.5334 3.51785 12.5334 3.67105C12.5334 3.82426 12.4987 3.95289 12.4293 4.05696C12.3628 4.16102 12.2747 4.24052 12.1648 4.29544C12.0578 4.35036 11.9408 4.3836 11.8136 4.39517L11.883 4.34747C12.0188 4.35036 12.1402 4.38649 12.2472 4.45587C12.357 4.52525 12.4438 4.6163 12.5074 4.72904C12.5709 4.83889 12.6027 4.96174 12.6027 5.0976C12.6027 5.25659 12.5637 5.39968 12.4857 5.52687C12.4076 5.65117 12.2949 5.74945 12.1475 5.82172C12 5.89109 11.8194 5.92578 11.6055 5.92578H10.374ZM10.8944 5.50085H11.5274C11.7009 5.50085 11.8353 5.46038 11.9307 5.37944C12.0261 5.2985 12.0737 5.18577 12.0737 5.04123C12.0737 4.8967 12.0246 4.78252 11.9263 4.69869C11.828 4.61197 11.6922 4.56861 11.5187 4.56861H10.8944V5.50085ZM10.8944 4.17403H11.4927C11.6575 4.17403 11.7832 4.13645 11.87 4.06129C11.9567 3.98325 12 3.87629 12 3.74043C12 3.60746 11.9567 3.50339 11.87 3.42823C11.7832 3.35019 11.6546 3.31116 11.4841 3.31116H10.8944V4.17403ZM14.1151 5.97781C13.9012 5.97781 13.7104 5.92867 13.5427 5.83039C13.378 5.72922 13.2493 5.58902 13.1568 5.4098C13.0672 5.22768 13.0224 5.01955 13.0224 4.78541C13.0224 4.54837 13.0687 4.34024 13.1612 4.16102C13.2537 3.9818 13.3823 3.84305 13.5471 3.74476C13.7147 3.64359 13.9055 3.593 14.1194 3.593C14.3362 3.593 14.527 3.64359 14.6918 3.74476C14.8566 3.84305 14.9852 3.9818 15.0777 4.16102C15.1702 4.34024 15.2164 4.54837 15.2164 4.78541C15.2164 5.01955 15.1688 5.22768 15.0734 5.4098C14.9809 5.58902 14.8522 5.72922 14.6875 5.83039C14.5227 5.92867 14.3319 5.97781 14.1151 5.97781ZM14.1151 5.5312C14.2278 5.5312 14.3261 5.50374 14.4099 5.44882C14.4967 5.39101 14.5632 5.30718 14.6094 5.19733C14.6585 5.08459 14.6831 4.94729 14.6831 4.78541C14.6831 4.62064 14.66 4.48333 14.6137 4.37349C14.5675 4.26075 14.501 4.17692 14.4143 4.122C14.3305 4.06707 14.2322 4.03961 14.1194 4.03961C14.0096 4.03961 13.9113 4.06707 13.8246 4.122C13.7408 4.17692 13.6743 4.26075 13.6251 4.37349C13.576 4.48333 13.5514 4.62064 13.5514 4.78541C13.5514 4.94729 13.576 5.08459 13.6251 5.19733C13.6743 5.30718 13.7408 5.39101 13.8246 5.44882C13.9084 5.50374 14.0053 5.5312 14.1151 5.5312ZM16.4667 5.97781C16.2933 5.97781 16.1473 5.94602 16.0288 5.88242C15.9132 5.81883 15.8265 5.73355 15.7686 5.6266C15.7137 5.51964 15.6863 5.40401 15.6863 5.27971C15.6863 5.14096 15.7209 5.01955 15.7903 4.91549C15.8626 4.81142 15.9667 4.73049 16.1025 4.67267C16.2413 4.61486 16.4089 4.58595 16.6055 4.58595H17.1475C17.1475 4.45876 17.1345 4.35325 17.1085 4.26942C17.0825 4.18559 17.0377 4.12344 16.9741 4.08297C16.9105 4.03961 16.8194 4.01793 16.7009 4.01793C16.5882 4.01793 16.4942 4.04395 16.419 4.09598C16.3468 4.14512 16.3005 4.21884 16.2803 4.31712H15.7686C15.786 4.1668 15.8351 4.03817 15.9161 3.93121C15.9999 3.82137 16.1097 3.73754 16.2456 3.67972C16.3815 3.62191 16.5332 3.593 16.7009 3.593C16.9119 3.593 17.0882 3.62914 17.2299 3.7014C17.3744 3.77078 17.4828 3.87051 17.5551 4.00059C17.6302 4.13067 17.6678 4.28966 17.6678 4.47755V5.92578H17.2212L17.1692 5.57456C17.1403 5.63238 17.1027 5.68585 17.0564 5.735C17.0131 5.78414 16.9625 5.8275 16.9047 5.86508C16.8469 5.89977 16.7804 5.92723 16.7052 5.94746C16.633 5.9677 16.5535 5.97781 16.4667 5.97781ZM16.5795 5.56589C16.6575 5.56589 16.7284 5.54999 16.7919 5.5182C16.8584 5.4864 16.9148 5.44159 16.9611 5.38378C17.0102 5.32597 17.0492 5.25948 17.0781 5.18432C17.107 5.10916 17.1244 5.02967 17.1302 4.94584V4.91983H16.6619C16.5636 4.91983 16.4826 4.93428 16.419 4.96319C16.3555 4.9892 16.3078 5.02678 16.276 5.07592C16.2471 5.12217 16.2326 5.1771 16.2326 5.24069C16.2326 5.31007 16.2471 5.36933 16.276 5.41847C16.3049 5.46472 16.3453 5.50085 16.3974 5.52687C16.4494 5.55288 16.5101 5.56589 16.5795 5.56589ZM18.2749 5.92578V3.64504H18.7389L18.7822 4.04829C18.84 3.94711 18.9108 3.86328 18.9947 3.7968C19.0785 3.73031 19.1782 3.67972 19.2939 3.64504C19.4124 3.61035 19.5425 3.593 19.6841 3.593V4.13934H19.3936C19.3127 4.13934 19.236 4.14946 19.1638 4.16969C19.0915 4.18993 19.0279 4.22317 18.973 4.26942C18.9181 4.31278 18.8747 4.37493 18.8429 4.45587C18.8111 4.53392 18.7952 4.63076 18.7952 4.74638V5.92578H18.2749ZM20.9727 5.97781C20.7761 5.97781 20.6012 5.92723 20.448 5.82605C20.2977 5.72488 20.1806 5.58613 20.0968 5.4098C20.013 5.23057 19.9711 5.02678 19.9711 4.79842C19.9711 4.56427 20.0144 4.35614 20.1011 4.17403C20.1879 3.99192 20.3093 3.85027 20.4654 3.7491C20.6244 3.64504 20.8065 3.593 21.0117 3.593C21.1678 3.593 21.3051 3.62336 21.4236 3.68406C21.5421 3.74187 21.6361 3.82715 21.7055 3.93989V2.80385H22.2258V5.92578H21.7618L21.7098 5.60492C21.6664 5.6714 21.6115 5.73355 21.545 5.79136C21.4814 5.84629 21.4019 5.89109 21.3066 5.92578C21.2141 5.96047 21.1028 5.97781 20.9727 5.97781ZM21.1071 5.52687C21.2314 5.52687 21.3384 5.49652 21.428 5.43581C21.5205 5.37511 21.5913 5.28983 21.6404 5.17999C21.6896 5.06725 21.7141 4.93572 21.7141 4.78541C21.7141 4.63509 21.6896 4.50501 21.6404 4.39517C21.5913 4.28243 21.5205 4.19571 21.428 4.13501C21.3355 4.0743 21.2285 4.04395 21.1071 4.04395C20.9915 4.04395 20.8874 4.0743 20.7949 4.13501C20.7024 4.19571 20.6301 4.28099 20.5781 4.39083C20.5261 4.50068 20.5001 4.63076 20.5001 4.78107C20.5001 4.93428 20.5261 5.06725 20.5781 5.17999C20.6301 5.28983 20.701 5.37511 20.7906 5.43581C20.8831 5.49652 20.9886 5.52687 21.1071 5.52687ZM23.694 5.97781C23.4743 5.97781 23.2936 5.94602 23.152 5.88242C23.0103 5.81594 22.9034 5.72632 22.8311 5.61359C22.7617 5.50085 22.7213 5.37222 22.7097 5.22768H23.23C23.2387 5.29128 23.2604 5.34909 23.2951 5.40112C23.3297 5.45026 23.3789 5.49073 23.4425 5.52253C23.509 5.55433 23.5914 5.57023 23.6896 5.57023C23.7735 5.57023 23.8443 5.55867 23.9021 5.53554C23.9599 5.50952 24.0033 5.47484 24.0322 5.43148C24.064 5.38812 24.0799 5.33753 24.0799 5.27971C24.0799 5.20167 24.0611 5.14096 24.0235 5.0976C23.9888 5.05424 23.9353 5.021 23.8631 4.99787C23.7937 4.97475 23.7055 4.9574 23.5986 4.94584C23.4685 4.92561 23.3514 4.89959 23.2474 4.86779C23.1433 4.836 23.0551 4.79408 22.9829 4.74205C22.9106 4.69002 22.8557 4.62498 22.8181 4.54693C22.7805 4.46599 22.7617 4.3706 22.7617 4.26075C22.7617 4.13067 22.7964 4.01504 22.8658 3.91387C22.9381 3.8127 23.0407 3.73465 23.1736 3.67972C23.3066 3.62191 23.4656 3.593 23.6506 3.593C23.9194 3.593 24.1276 3.65082 24.275 3.76644C24.4253 3.88207 24.5149 4.0425 24.5438 4.24774H24.0495C24.0322 4.16969 23.9888 4.10899 23.9194 4.06563C23.8501 4.02227 23.7576 4.00059 23.6419 4.00059C23.5205 4.00059 23.428 4.02227 23.3644 4.06563C23.3037 4.10899 23.2734 4.16825 23.2734 4.24341C23.2734 4.29544 23.2864 4.34169 23.3124 4.38216C23.3413 4.42263 23.3904 4.45876 23.4598 4.49056C23.5292 4.51947 23.626 4.54259 23.7503 4.55994C23.9469 4.58595 24.1073 4.62209 24.2316 4.66834C24.3588 4.71459 24.4528 4.78396 24.5135 4.87646C24.5771 4.96608 24.6074 5.08893 24.6045 5.24503C24.6045 5.40112 24.567 5.53409 24.4918 5.64394C24.4166 5.7509 24.3111 5.83328 24.1753 5.89109C24.0394 5.94891 23.879 5.97781 23.694 5.97781Z"
          fill="white"
        />
        <mask id="path-3-inside-1_9167_31933" fill="white">
          <path d="M0.136719 15.7903C0.136719 12.0272 3.18733 8.97656 6.95046 8.97656H68.8936C72.6567 8.97656 75.7073 12.0272 75.7073 15.7903V75.8751C75.7073 79.6383 72.6567 82.6889 68.8936 82.6889H6.95047C3.18734 82.6889 0.136719 79.6382 0.136719 75.8751V15.7903Z" />
        </mask>
        <path
          d="M0.136719 15.7903C0.136719 12.0272 3.18733 8.97656 6.95046 8.97656H68.8936C72.6567 8.97656 75.7073 12.0272 75.7073 15.7903V75.8751C75.7073 79.6383 72.6567 82.6889 68.8936 82.6889H6.95047C3.18734 82.6889 0.136719 79.6382 0.136719 75.8751V15.7903Z"
          fill="white"
        />
        <path
          d="M6.95046 8.97656V10.2154H68.8936V8.97656V7.7377H6.95046V8.97656ZM75.7073 15.7903H74.4685V75.8751H75.7073H76.9462V15.7903H75.7073ZM68.8936 82.6889V81.45H6.95047V82.6889V83.9277H68.8936V82.6889ZM0.136719 75.8751H1.37558V15.7903H0.136719H-1.10214V75.8751H0.136719ZM6.95047 82.6889V81.45C3.87154 81.45 1.37558 78.954 1.37558 75.8751H0.136719H-1.10214C-1.10214 80.3224 2.50314 83.9277 6.95047 83.9277V82.6889ZM75.7073 75.8751H74.4685C74.4685 78.954 71.9725 81.45 68.8936 81.45V82.6889V83.9277C73.3409 83.9277 76.9462 80.3225 76.9462 75.8751H75.7073ZM68.8936 8.97656V10.2154C71.9725 10.2154 74.4685 12.7114 74.4685 15.7903H75.7073H76.9462C76.9462 11.343 73.3409 7.7377 68.8936 7.7377V8.97656ZM6.95046 8.97656V7.7377C2.50313 7.7377 -1.10214 11.343 -1.10214 15.7903H0.136719H1.37558C1.37558 12.7114 3.87154 10.2154 6.95046 10.2154V8.97656Z"
          fill="#61D8A8"
          mask="url(#path-3-inside-1_9167_31933)"
        />
        <path
          d="M6.33008 17.6496C6.33008 16.2812 7.43939 15.1719 8.8078 15.1719H67.0343C68.4027 15.1719 69.5121 16.2812 69.5121 17.6496V30.0382C69.5121 31.4066 68.4027 32.5159 67.0343 32.5159H8.8078C7.43939 32.5159 6.33008 31.4066 6.33008 30.0382V17.6496Z"
          fill="#D4FAE8"
        />
        <g clipPath="url(#clip1_9167_31933)">
          <path
            d="M40.2747 20.8242H35.5773C35.2067 20.8242 34.9062 21.1247 34.9062 21.4953V26.1926C34.9062 26.5632 35.2067 26.8637 35.5773 26.8637H40.2747C40.6453 26.8637 40.9457 26.5632 40.9457 26.1926V21.4953C40.9457 21.1247 40.6453 20.8242 40.2747 20.8242Z"
            stroke="#1DB485"
            strokeWidth="0.67105"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M36.9171 23.5062C37.2878 23.5062 37.5882 23.2057 37.5882 22.8351C37.5882 22.4645 37.2878 22.1641 36.9171 22.1641C36.5465 22.1641 36.2461 22.4645 36.2461 22.8351C36.2461 23.2057 36.5465 23.5062 36.9171 23.5062Z"
            stroke="#1DB485"
            strokeWidth="0.67105"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M40.943 24.853L39.9076 23.8176C39.7818 23.6918 39.6111 23.6211 39.4332 23.6211C39.2552 23.6211 39.0846 23.6918 38.9587 23.8176L35.9102 26.8661"
            stroke="#1DB485"
            strokeWidth="0.67105"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M6.33008 39.3309C6.33008 38.3046 7.16206 37.4727 8.18837 37.4727H54.0263C55.0526 37.4727 55.8846 38.3046 55.8846 39.3309C55.8846 40.3573 55.0526 41.1892 54.0263 41.1892H8.18837C7.16207 41.1892 6.33008 40.3573 6.33008 39.3309Z"
          fill="#E8ECF1"
        />
        <path
          d="M6.33008 46.7606C6.33008 45.7343 7.16206 44.9023 8.18837 44.9023H39.1599C40.1862 44.9023 41.0182 45.7343 41.0182 46.7606C41.0182 47.7869 40.1862 48.6189 39.1599 48.6189H8.18837C7.16206 48.6189 6.33008 47.7869 6.33008 46.7606Z"
          fill="#E8ECF1"
        />
        <path
          d="M6.33008 55.4364C6.33008 54.4101 7.16206 53.5781 8.18837 53.5781H24.2936C25.3199 53.5781 26.1519 54.4101 26.1519 55.4364C26.1519 56.4627 25.3199 57.2947 24.2936 57.2947H8.18837C7.16206 57.2947 6.33008 56.4627 6.33008 55.4364Z"
          fill="#E8ECF1"
        />
        <path
          d="M6.33008 62.8661C6.33008 61.8398 7.16206 61.0078 8.18837 61.0078H67.6538C68.6801 61.0078 69.5121 61.8398 69.5121 62.8661C69.5121 63.8924 68.6801 64.7244 67.6538 64.7244H8.18837C7.16206 64.7244 6.33008 63.8924 6.33008 62.8661Z"
          fill="#E8ECF1"
        />
        <path
          d="M6.33008 70.2997C6.33008 69.2734 7.16206 68.4414 8.18837 68.4414H67.6538C68.6801 68.4414 69.5121 69.2734 69.5121 70.2997C69.5121 71.326 68.6801 72.158 67.6538 72.158H8.18837C7.16206 72.158 6.33008 71.326 6.33008 70.2997Z"
          fill="#E8ECF1"
        />
        <path
          d="M6.33008 78.356C6.33008 77.6718 6.88474 77.1172 7.56894 77.1172H22.4353C23.1195 77.1172 23.6741 77.6718 23.6741 78.356C23.6741 79.0403 23.1195 79.5949 22.4353 79.5949H7.56894C6.88474 79.5949 6.33008 79.0403 6.33008 78.356Z"
          fill="#20A976"
        />
        <mask id="path-15-inside-2_9167_31933" fill="white">
          <path d="M84.3789 18.8908C84.3789 14.1014 88.2615 10.2188 93.0509 10.2188H140.747C145.537 10.2188 149.419 14.1014 149.419 18.8908V66.587C149.419 71.3764 145.537 75.259 140.747 75.259H93.0509C88.2615 75.259 84.3789 71.3764 84.3789 66.587V18.8908Z" />
        </mask>
        <path
          d="M84.3789 18.8908C84.3789 14.1014 88.2615 10.2188 93.0509 10.2188H140.747C145.537 10.2188 149.419 14.1014 149.419 18.8908V66.587C149.419 71.3764 145.537 75.259 140.747 75.259H93.0509C88.2615 75.259 84.3789 71.3764 84.3789 66.587V18.8908Z"
          fill="#F7F9FB"
        />
        <path
          d="M93.0509 10.2188V10.8382H140.747V10.2188V9.59932H93.0509V10.2188ZM149.419 18.8908H148.8V66.587H149.419H150.039V18.8908H149.419ZM140.747 75.259V74.6396H93.0509V75.259V75.8785H140.747V75.259ZM84.3789 66.587H84.9983V18.8908H84.3789H83.7595V66.587H84.3789ZM93.0509 75.259V74.6396C88.6036 74.6396 84.9983 71.0343 84.9983 66.587H84.3789H83.7595C83.7595 71.7185 87.9194 75.8785 93.0509 75.8785V75.259ZM149.419 66.587H148.8C148.8 71.0343 145.194 74.6396 140.747 74.6396V75.259V75.8785C145.879 75.8785 150.039 71.7185 150.039 66.587H149.419ZM140.747 10.2188V10.8382C145.194 10.8382 148.8 14.4435 148.8 18.8908H149.419H150.039C150.039 13.7593 145.879 9.59932 140.747 9.59932V10.2188ZM93.0509 10.2188V9.59932C87.9194 9.59932 83.7595 13.7593 83.7595 18.8908H84.3789H84.9983C84.9983 14.4435 88.6036 10.8382 93.0509 10.8382V10.2188Z"
          fill="#E7ECF1"
          mask="url(#path-15-inside-2_9167_31933)"
        />
      </g>
      <defs>
        <clipPath id="clip0_9167_31933">
          <rect width="117" height="83" fill="white" />
        </clipPath>
        <clipPath id="clip1_9167_31933">
          <rect
            width="8.0526"
            height="8.0526"
            fill="white"
            transform="translate(33.8945 19.8164)"
          />
        </clipPath>
      </defs>
    </svg>
  </div>
);

const getHealthIconConfig = (statusTone, dashboardMaterValue) => {
  const toneKey = String(statusTone || "healthy").replaceAll("-", "_");
  const config = HEALTH_CONFIG(dashboardMaterValue);
  return config[toneKey] || config.healthy;
};

const getActiveBoardsSubtitle = (completedTrendCard, selectedRange) => {
  const rangeLabel = selectedRange?.[0]?.label || "Last 7 Days";
  const trend = completedTrendCard?.trend || "Ideal";
  const percentage =
    String(completedTrendCard?.subTitle ?? "")
      .trim()
      .split(/\s+/)[0] || "0%";
  return `Completed ${trend} by ${percentage} from ${rangeLabel}`;
};

const WorkspaceWidget = ({
  apiLoading = false,
  workspaces = [],
  dashboardMaterValue = [],
  placeholder,
  fromPage,
  boardFilter,
  upcomingDeadlinesData = [],
  layout = "old",
  selectedRange = [],
  completedTrendCard = null,
}) => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const [sorting, setSorting] = useState([]);
  const [{ data: auth }] = useAuth();
  const [workspaceFilter, setWorkspaceFilter] = useState([]);
  const gridRef = useRef(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [healthyFilter, setHealthyFilter] = useState([]);
  const [viewMode, setViewMode] = useState(layout === "new" ? "list" : "grid");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setViewWidth(width);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [apiLoading, viewMode]);

  const normalizeHealthLabel = (label) =>
    String(label ?? "")
      .toLowerCase()
      .replaceAll(" ", "-");

  const normalizeHealthToken = (name) =>
    String(name ?? "")
      .trim()
      .toLowerCase()
      .replaceAll(" ", "-");

  const getHealthStatusColor = (statusToken) =>
    dashboardMaterValue?.find(
      (check) => normalizeHealthLabel(check.label) === normalizeHealthLabel(statusToken),
    )?.color;

  const resolveMetricTrendColor = useCallback(
    (trend, options = {}) =>
      getMetricTrendColor(trend, { ...options, dashboardMaterValue }),
    [dashboardMaterValue],
  );

  const filterOptions = useMemo(() => {
    const seen = new Set();
    const workspaceOptions = workspaces.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return [
      ...workspaceOptions.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    ];
  }, [workspaces]);

  /**
   * Derive cards in one pass (search + workspace + health filters).
   * Avoids the empty-state flash from dual useEffects racing on mount.
   */
  const filteredCards = useMemo(() => {
    if (!workspaces?.length) return [];

    const query = searchText.trim().toLowerCase();

    const matchesWorkspaceRow = (item) => {
      if (!workspaceFilter?.length) return true;
      const ids = new Set(workspaceFilter.map((w) => String(w.id)));
      if (ids.has("all")) return true;
      return workspaceFilter.some((w) => String(w.id) === String(item.id));
    };

    const healthTokens =
      healthyFilter?.length > 0
        ? healthyFilter.map((f) => normalizeHealthToken(f.name))
        : ["all-healthy"];
    const showAllHealth = healthTokens.includes("all-healthy");

    return workspaces
      .filter(matchesWorkspaceRow)
      .filter((item) => {
        if (!query) return true;
        return item.name?.toLowerCase().includes(query);
      })
      .filter((item) => {
        if (showAllHealth) return true;
        const tone = item.statusTone?.toLowerCase() ?? "";
        return healthTokens.some(
          (token) => tone === token || tone.includes(token) || token.includes(tone),
        );
      })
      .map((item) => ({
        ...item,
        trendIcon: getTrendIcon(item.healthLabel, item.compareStatus),
      }));
  }, [workspaces, searchText, workspaceFilter, healthyFilter]);

  const getRenderKey = (item, index, prefix = "item") =>
    [
      prefix,
      fromPage || "dashboard",
      item?.id ?? "no-id",
      item?.workspaceName ?? "no-workspace",
      item?.name ?? "no-name",
      index,
    ].join("-");

  const columns = useMemo(
    () => [
      {
        id: "serialNumber",
        header: "S.No",
        cell: ({ row }) => row.index + 1,
        canSort: false,
      },
      {
        accessorKey: "name",
        header: "Workspace",
        cell: ({ row }) => (
          <span
            className="fw-600 workspace-widget__table-company-name-link"
            style={{
              cursor: row.original.activeBoards > 0 ? "pointer" : "default",
            }}
          >
            {row.original.name}
          </span>
        ),
        canSort: true,
      },
      ...(layout === "old"
        ? [
            {
              accessorKey: "createdDate",
              header: "Created Date",
              cell: ({ row }) => {
                return dayjs(row.original.createdDate).format("DD/MM/YYYY");
              },
              canSort: false,
            },
          ]
        : []),
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const getColor = dashboardMaterValue.find(
            (check) =>
              normalizeHealthLabel(check.label) ===
              normalizeHealthLabel(row.original.statusTone),
          );
          const statusColor = getColor?.color || "#666666";
          const isNewLayout = layout === "new";
          return (
            <span
              className={`workspace-widget__table-status workspace-widget__table-status--${row.original.statusTone}`}
              style={{
                backgroundColor: isNewLayout
                  ? hexToRgba(statusColor, 0.12)
                  : statusColor,
                color: isNewLayout ? statusColor : "#FFFFFF",
                border: "none",
                fontSize: "12px",
                fontWeight: "500",
                lineHeight: "18px",
                padding: "4px 8px",
                borderRadius: "4px",
                maxWidth: "fit-content",
              }}
            >
              {row.original.status}
            </span>
          );
        },
        canSort: true,
      },
      {
        accessorKey: "activeBoards",
        header: "Active Boards",
        cell: ({ getValue }) => getValue(),
        canSort: true,
      },
      ...(layout === "old"
        ? [
            {
              accessorKey: "",
              header: "Over Due POP %",
              cell: ({ row }) => {
                const { progress, compareStatus, trendTone, footer } = row.original;

                const colorCode = resolveMetricTrendColor(compareStatus, {
                  isOverdue: true,
                });

                return (
                  <div className="d-flex align-items-center gap-2">
                    <div className="workspace-widget__progress-wrap workspace-widget__progress-wrap-row">
                      <span
                        className={`workspace-widget__progress workspace-widget__progress--${trendTone}`}
                        style={{
                          color: colorCode || "#66666",
                        }}
                      >
                        {compareStatus === "Decrease" ? (
                          <TrendingDown color={colorCode} />
                        ) : compareStatus === "Increase" ? (
                          <TrendingUp color={colorCode} />
                        ) : (
                          <>&#160;&#160;&#160;&#160;&#160;</>
                        )}{" "}
                        {progress}%
                      </span>
                      <span className="workspace-widget__footer workspace-widget__footer__list">
                        {footer}
                      </span>
                    </div>
                  </div>
                );
              },
              canSort: false,
            },
          ]
        : []),

      ...(layout === "new"
        ? [
            {
              accessorKey: "overdueTasks",
              header: "Overdue Tasks",
              cell: ({ row }) => {
                const { progress, compareStatus, trendTone, footer } = row.original;
                return (
                  <span className="workspace-widget__footer workspace-widget__footer__list">
                    {footer.replace("overdue", "")}
                  </span>
                );
              },
              canSort: false,
            },
            {
              accessorKey: "trendVsLastMonth",
              header: "Overdue POP %",
              cell: ({ row }) => {
                const { progress, compareStatus, trendTone, footer } = row.original;
                const colorCode = resolveMetricTrendColor(compareStatus, {
                  isOverdue: true,
                });
                const colors = getHealthStatusColor(
                  normalizeHealthLabel(row.original.healthLabel),
                );

                return (
                  <span
                    className={`workspace-widget__progress workspace-widget__progress--${trendTone}`}
                    style={{
                      color: colors || "#66666",
                    }}
                  >
                    {progress}%{" "}
                    {compareStatus === "Decrease" ? (
                      <DownArrow color={colors} />
                    ) : compareStatus === "Increase" ? (
                      <UpArrow color={colors} />
                    ) : (
                      <>&#160;&#160;&#160;&#160;&#160;</>
                    )}
                  </span>
                );
              },
              canSort: true,
            },
            {
              accessorKey: "graph",
              header: "Health",
              cell: ({ row }) => {
                const statusColor =
                  getHealthStatusColor(row.original.statusTone) ||
                  COLORS_VALUES(dashboardMaterValue).healthy;
                const series = buildWorkspaceSparklineSeries(row.original);
                return <WorkspaceTrendSparkline data={series} color={statusColor} />;
              },
              canSort: false,
            },
          ]
        : []),
    ],
    [dashboardMaterValue, layout],
  );

  const handleSearchText = (value) => {
    setSearchText(value);
  };

  const handleSearchTextClear = () => {
    setSearchText("");
  };

  const handleGotoPage = (param, data) => {
    if (param === "workspace") {
      const workspaceId = data.id;
      const boardIds = getScopedBoardIds(auth?.details, workspaceId);
      const accessibleBoards = getAccessibleDashboardBoards(auth?.details);
      const workspaceBoards = Array.isArray(accessibleBoards)
        ? accessibleBoards.filter(
            (board) => Number(board.workspaceId) === Number(workspaceId),
          )
        : [];

      // Single board in this workspace → open board task page directly.
      if (
        (workspaceBoards.length === 1 || boardIds.length === 1) &&
        (workspaceBoards[0] || boardIds[0] != null)
      ) {
        const singleBoard =
          workspaceBoards[0] ||
          ({
            id: boardIds[0],
            name: data.name || "",
            workspaceId,
            workspaceName: data.name || "",
          });
        persistDashboardBoardSelection(singleBoard, {
          status: data.status,
          statusTone: data.statusTone,
          workspaceId,
          workspaceName: data.name,
        });
        navigate(DASHBOARD_ROUTES.board);
        return;
      }

      navigate(DASHBOARD_ROUTES.workspace);
      localStorage.setItem(
        "selectWorkspaceDashboard",
        JSON.stringify({
          type: "workspace",
          id: Number(data.id),
          name: data.name,
          status: data.status,
          statusTone: data.statusTone,
        }),
      );
    }

    if (param === "board") {
      const workspaceId = data.workspaceId ?? data.workspace_id ?? null;
      const workspaceName = data.workspaceName ?? data.workspace_name ?? "";
      navigate(DASHBOARD_ROUTES.board);
      localStorage.setItem(
        "selectBoardDashboard",
        JSON.stringify({
          type: "board",
          id: data.id,
          name: data.name,
          status: data.healthLabel,
          statusTone: data.statusTone,
          workspaceId,
          workspaceName,
        }),
      );
      if (workspaceId != null) {
        localStorage.setItem(
          "selectWorkspaceDashboard",
          JSON.stringify({
            type: "workspace",
            id: Number(workspaceId),
            name: workspaceName,
            status: data.healthLabel,
            statusTone: data.statusTone,
          }),
        );
      }
    }
  };

  const handleWorkspaceTableRowClick = useCallback(
    (rowData) => {
      if (!rowData || Number(rowData.activeBoards) <= 0) return;
      handleGotoPage(fromPage, rowData);
    },
    [fromPage],
  );

  const handleExportWorkspaceOverview = useCallback(() => {
    if (!filteredCards?.length) return;

    const rows = filteredCards.map((item, index) => ({
      "S.No": index + 1,
      Workspace: item.name ?? "",
      Status: item.status ?? item.healthLabel ?? "",
      "Active Boards": item.activeBoards ?? 0,
      "Overdue Tasks": String(item.footer ?? "")
        .replace(/overdue/gi, "")
        .trim(),
      "Overdue POP %": item.progress ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Workspace Overview");
    XLSX.writeFile(
      workbook,
      `workspace-overview-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`,
    );
  }, [filteredCards]);

  const renderActiveBoardCards = () =>
    filteredCards.map((item, index) => {
      const statusColor =
        getHealthStatusColor(item.statusTone) ||
        getHealthIconConfig(item.statusTone, dashboardMaterValue)?.color ||
        "#666666";
      // Keep raw API percentages for labels (may be > 100); only use them
      // proportionally for bar widths so e.g. 100% vs 900% is not drawn as 50/50.
      const overduePct = Math.max(
        0,
        Number(item?.overduePercentageTask?.percentage ?? item?.progress ?? 0) || 0,
      );
      const completionPct = Math.max(
        0,
        Number(
          item?.completedTask?.percentage ?? (overduePct > 0 ? 100 - overduePct : 0),
        ) || 0,
      );
      const progressTotal = overduePct + completionPct || 1;
      const overdueWidth = (overduePct / progressTotal) * 100;
      const completionWidth = (completionPct / progressTotal) * 100;
      const assignee = normalizeBoardAssignee(getBoardAssignee(item));
      const assigneeName = getAssigneeDisplayName(assignee);
      const boardWorkspaceName =
        item.workspaceName ||
        safeParseLocalStorage("selectWorkspaceDashboard")?.name ||
        "";
      const showBoardWorkspaceName =
        fromPage === "board" &&
        Boolean(boardWorkspaceName) &&
        (!isDashboardAdmin(auth?.details) || isAdminMyWorkspaceMode(auth?.details));

      return (
        <article
          key={getRenderKey(item, index, "active-board-card")}
          className="workspace-widget__active-board-card workspace-widget__active-board-card--detailed workspace-hover-card"
          style={{
            borderColor: hexToRgba(statusColor, 0.2),
          }}
          onClick={() => handleGotoPage("board", item)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleGotoPage("board", item);
          }}
          tabIndex={0}
          role="button"
          aria-label={`${boardWorkspaceName ? `${boardWorkspaceName}, ` : ""}${item.name}, ${item.healthLabel}, ${assigneeName}, Overdue ${overduePct}%, Completion ${completionPct}%`}
        >
          <span
            className="workspace-widget__active-board-card-status-badge"
            style={{
              "--badge-bg": hexToRgba(statusColor, 0.08),
              color: statusColor,
              borderColor: hexToRgba(statusColor, 0.25),
            }}
          >
            {item.healthLabel}
          </span>

          {showBoardWorkspaceName && (
            <p
              className="workspace-widget__active-board-card-workspace"
              title={boardWorkspaceName}
            >
              {boardWorkspaceName}
            </p>
          )}

          <div className="workspace-widget__active-board-card-top">
            <p className="workspace-widget__active-board-card-name">{item.name}</p>
            <div className="workspace-widget__active-board-card-assignee">
              <p className="workspace-widget__active-board-card-assignee-label">
                Lead by:
              </p>
              <div className="workspace-widget__active-board-card-assignee-content">
                {assignee ? (
                  <LogoAvatarShowLetter
                    genaralData={assignee}
                    profileName="displayName"
                    outerClassName="workspace-widget__active-board-card-avatar"
                    innerClassName="workspace-widget__active-board-card-avatar-initials"
                  />
                ) : (
                  <span
                    className="workspace-widget__active-board-card-avatar workspace-widget__active-board-card-avatar--placeholder"
                    aria-hidden
                  />
                )}
                <span
                  className="workspace-widget__active-board-card-assignee-name"
                  title={assigneeName}
                >
                  {assigneeName}
                </span>
              </div>
            </div>
          </div>

          <div
            className="workspace-widget__active-board-card-progress"
            role="img"
            aria-label={`Overdue ${overduePct}%, Completion ${completionPct}%`}
          >
            {overdueWidth > 0 ? (
              <span
                className={`workspace-widget__active-board-card-progress-segment workspace-widget__active-board-card-progress-segment--overdue${
                  completionWidth <= 0 ? " is-single" : ""
                }`}
                style={{
                  width: `${overdueWidth}%`,
                  backgroundColor: getActiveBoardProgress(
                    item?.overdueTask?.compareStatus,
                    true,
                    dashboardMaterValue,
                  ).overdue,
                }}
              />
            ) : null}
            {completionWidth > 0 ? (
              <span
                className={`workspace-widget__active-board-card-progress-segment workspace-widget__active-board-card-progress-segment--completion${
                  overdueWidth <= 0 ? " is-single" : ""
                }`}
                style={{
                  width: `${completionWidth}%`,
                  backgroundColor: getActiveBoardProgress(
                    item?.completedTask?.trend,
                    false,
                    dashboardMaterValue,
                  ).completion,
                }}
              />
            ) : null}
          </div>

          <div className="workspace-widget__active-board-card-metrics">
            <span className="workspace-widget__active-board-card-metric">
              Overdue {overduePct}%{" "}&#160;
              {item?.overdueTask?.compareStatus === "Decrease" ? (
                <DownArrow
                  color={getMetricTrendColor(item?.overdueTask?.compareStatus, {
                    isOverdue: true,
                    dashboardMaterValue,
                  })}
                />
              ) : item?.overdueTask?.compareStatus === "Increase" ? (
                <UpArrow
                  color={getMetricTrendColor(item?.overdueTask?.compareStatus, {
                    isOverdue: true,
                    dashboardMaterValue,
                  })}
                />
              ) : (
                <>&#160;&#160;&#160;&#160;&#160;</>
              )}{" "}
            </span>
            <span className="workspace-widget__active-board-card-metric">
              Completion {completionPct}%{" "}&#160;
              {item?.completedTask?.trend === "Decrease" ? (
                <DownArrow
                  color={getMetricTrendColor(item?.completedTask?.trend, {
                    isOverdue: false,
                    dashboardMaterValue,
                  })}
                />
              ) : item?.completedTask?.trend === "Increase" ? (
                <UpArrow
                  color={getMetricTrendColor(item?.completedTask?.trend, {
                    isOverdue: false,
                    dashboardMaterValue,
                  })}
                />
              ) : (
                <>&#160;&#160;&#160;&#160;&#160;</>
              )}{" "}
            </span>
          </div>
        </article>
      );
    });

  const renderWorkspaceCards = () =>
    filteredCards.map((item, index) => {
      const statusColor = getHealthStatusColor(item.statusTone);
      const activeTrendColor = resolveMetricTrendColor(item?.activeTasks?.trend);
      const completedTrendColor = resolveMetricTrendColor(item?.completedTask?.trend);
      const overdueTrendColor = resolveMetricTrendColor(item?.compareStatus, {
        isOverdue: true,
      });
      const overduePercentageTrendColor = resolveMetricTrendColor(
        item?.overduePercentageTask?.trend,
        {
          isOverdue: true,
        },
      );
      const isWorkspaceView = fromPage === "workspace" || fromPage === "board";

      return (
        <article
          key={getRenderKey(item, index, "workspace-card")}
          className={`workspace-widget__card ${isWorkspaceView ? "workspace-hover-card" : ""} ${item.activeBoards == 0 ? "disabled-card" : ""}`}
          onClick={() => {
            if (item.activeBoards > 0 && isWorkspaceView) {
              handleGotoPage(fromPage, item);
            } else {
              handleGotoPage(fromPage, item);
              return false;
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && item.activeBoards > 0 && isWorkspaceView) {
              handleGotoPage(fromPage, item);
            } else {
              handleGotoPage(fromPage, item);
              return false;
            }
          }}
          tabIndex={0}
          style={
            isWorkspaceView && hoveredIndex === index
              ? {
                  border: `1px solid ${statusColor}`,
                  boxShadow: `1px 1px 20px 2px ${hexToRgba(statusColor, 0.1)}`,
                  transition: "all 0.3s ease",
                }
              : undefined
          }
          onMouseEnter={isWorkspaceView ? () => setHoveredIndex(index) : undefined}
          onMouseLeave={isWorkspaceView ? () => setHoveredIndex(null) : undefined}
        >
          <div
            className={`${fromPage === "workspace" ? "workspace-heading" : fromPage === "board" ? "board-heading" : "task-heading"}`}
          >
            <h3 className="workspace-widget__card-title">
              <span className="workspace-widget__card-title-name">
                {fromPage !== "workspace" && (
                  <span
                    className={`workspace-widget__status workspace-widget__status--${item.statusTone}`}
                    style={{
                      color: statusColor || "#666",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: statusColor ? `${statusColor}` : "#f2f2f2",
                        color: statusColor || "#666",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    >
                      &#160;
                    </span>
                    {item.healthLabel}
                  </span>
                )}{" "}
                {item.name}{" "}
              </span>
              {fromPage !== "workspace" && (
                <button
                  className="workspace-widget__card-title-expand"
                  role="button"
                  tabIndex={0}
                >
                  <img src={boardExpandIcon} aria-hidden alt="boardExpand" />
                </button>
              )}
              {fromPage === "workspace" && (
                <span
                  className={`workspace-widget__status workspace-widget__status--${item.statusTone}`}
                  style={{
                    backgroundColor: statusColor ? `${statusColor}10` : "#DC262610",
                    color: statusColor || "#666",
                    border: `1px solid ${statusColor ? hexToRgba(statusColor, 0.1) : "#DC262610"}`,
                  }}
                >
                  {item.healthLabel}
                </span>
              )}
            </h3>
            {fromPage === "workspace" && (
              <div className="workspace-widget__card-description">
                <Bookmarked
                  bgColor={item.isBookmarked ? statusColor : "#6D6E78"}
                  style={{ width: "14px", height: "19px" }}
                />
              </div>
            )}
          </div>
          <dl className="workspace-widget__metric-list">
            {fromPage === "workspace" && (
              <>
                <div className="workspace-widget__metric-row">
                  <dd className="workspace-widget__metric-label">Active Boards</dd>
                  <dd className="workspace-widget__metric-value">
                    {" "}
                    {item.activeBoards}{" "}
                  </dd>
                </div>
              </>
            )}
            {fromPage === "board" && (
              <>
                <div className="workspace-widget__metric-row">
                  <dd className="workspace-widget__metric-label">Completed</dd>
                  <dd className="workspace-widget__progress-wrap">
                    {" "}
                    <span
                      className={`workspace-widget__progress workspace-widget__progress--${item.trendTone}`}
                      style={{
                        color: completedTrendColor,
                      }}
                    >
                      {item?.completedTask?.trend === "Decrease" ? (
                        <TrendingDown color={completedTrendColor} />
                      ) : item?.completedTask?.trend === "Increase" ? (
                        <TrendingUp color={completedTrendColor} />
                      ) : null}{" "}
                      {item?.completedTask?.percentage}%{" "}
                    </span>{" "}
                    {fromPage === "workspace" && (
                      <span className="workspace-widget__footer">
                        {" "}
                        {item?.completedTask?.footer}{" "}
                      </span>
                    )}
                  </dd>
                </div>
              </>
            )}
            {fromPage === "board" && (
              <div className="workspace-widget__metric-row">
                <dd className="workspace-widget__metric-label">Overdue</dd>
                <dd className="workspace-widget__progress-wrap">
                  {" "}
                  <span
                    className={`workspace-widget__progress workspace-widget__progress--${item.trendTone}`}
                    style={{
                      color: overduePercentageTrendColor,
                    }}
                  >
                    {" "}
                    {item.overduePercentageTask?.trend === "Decrease" ? (
                      <TrendingDown color={overduePercentageTrendColor} />
                    ) : item.overduePercentageTask?.trend === "Increase" ? (
                      <TrendingUp color={overduePercentageTrendColor} />
                    ) : null}{" "}
                    {item.overduePercentageTask?.percentage}%{" "}
                  </span>{" "}
                </dd>
              </div>
            )}
            {fromPage === "workspace" && (
              <div className="workspace-widget__metric-row">
                <dd className="workspace-widget__metric-label">
                  Overdue POP {fromPage === "board" ? "%" : ""}
                </dd>
                <dd className="workspace-widget__progress-wrap">
                  {" "}
                  <span
                    className={`workspace-widget__progress workspace-widget__progress--${item.trendTone}`}
                    style={{
                      color: overdueTrendColor,
                    }}
                  >
                    {" "}
                    {item.compareStatus === "Decrease" ? (
                      <TrendingDown color={overdueTrendColor} />
                    ) : item.compareStatus === "Increase" ? (
                      <TrendingUp color={overdueTrendColor} />
                    ) : null}{" "}
                    {item.progress}%{" "}
                  </span>{" "}
                  {fromPage === "workspace" && (
                    <span className="workspace-widget__footer"> {item.footer} </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </article>
      );
    });

  return (
    <section
      className={`workspace-widget${fromPage === "board" ? " workspace-widget--active-boards" : ""}`}
      aria-label="Workspace cards widget"
    >
      {fromPage === "board" && (
        <header className="workspace-widget__active-boards-header">
          <div className="workspace-widget__active-boards-header-content">
            <h4 className="workspace-widget__title workspace-widget__title--active-boards">
              Active Boards
            </h4>
            <p className="workspace-widget__title-date">
              {getActiveBoardsSubtitle(completedTrendCard, selectedRange)}
            </p>
          </div>
          <ActiveBoardsHeaderArt />
        </header>
      )}
      {fromPage === "workspace" && layout === "new" && (
        <div className="workspace-widget__overview-header">
          <h4 className="workspace-widget__title">Workspace Overview</h4>
          <button
            type="button"
            className="btn workspace-widget__export-btn"
            onClick={handleExportWorkspaceOverview}
            disabled={!filteredCards?.length}
            title="Export To Excel"
          >
            <ExportUploadIcon color="#00ADF0" />
            Export To Excel
          </button>
        </div>
      )}
      {fromPage === "workspace" && layout === "old" && (
        <div className="workspace-widget__toolbar">
          {workspaces?.length > 2 && (
            <div className="workspace-widget__search-wrap">
              <label
                htmlFor="workspace-filter-select"
                className="workspace-widget__sr-only"
              >
                Workspace filter
              </label>

              <SelectDropDown
                key={"workspace-filter"}
                multi={true}
                options={filterOptions || []}
                labelField="name"
                valueField="id"
                searchBy="name"
                values={workspaceFilter}
                searchable={true}
                title={fromPage === "workspace" ? "All Workspace" : "All Boards"}
                onChange={(value) => setWorkspaceFilter(value?.length ? value : [])}
                placeholder={fromPage === "workspace" ? "All Workspace" : "All Boards"}
                className={
                  "filter-select-dropDown p-2 workspace-widget__filter-select custom-dropdownRenderer"
                }
                disabled={workspaces === null || workspaces?.length === 0 ? true : false}
                optionType="checkbox"
                dropdownPosition={"auto"}
                customSearch={true}
                showSelectAll={true}
              />
            </div>
          )}
          <div className="workspace-widget__toolbar-actions">
            {fromPage === "workspace" && layout === "old" && (
              <div
                className="workspace-widget__view-toggle"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  className={`workspace-widget__view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  title="Grid View"
                >
                  <img
                    src={viewMode === "grid" ? gridView : gridView}
                    alt="grid-view"
                    width={"20px"}
                  />
                </button>
                <button
                  type="button"
                  className={`workspace-widget__view-btn ${viewMode === "list" ? "is-active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  title="List View"
                >
                  <img
                    src={viewMode === "list" ? listInActive : listInActive}
                    width={"20px"}
                    alt="list-view"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(workspaceFilter?.length > 0 || healthyFilter?.length > 0) && (
        <div className="workspace-widget__toolbar-seletced-filters">
          {workspaceFilter.length > 0 && (
            <div className="workspace-widget__toolbar-seletced-filters-item">
              <span className="workspace-widget__toolbar-seletced-filters-item-label">
                Workspace:
              </span>
              {workspaceFilter.map((w, index) => (
                <div
                  className="workspace-widget__toolbar-seletced-filters-item-value"
                  key={getRenderKey(w, index, "workspace-filter")}
                >
                  {w.name}
                  <span
                    className="workspace-widget__toolbar-seletced-filters-item-close"
                    onClick={() =>
                      setWorkspaceFilter(workspaceFilter?.filter((f) => f.id !== w.id))
                    }
                  >
                    <img src={closeIcon} alt="close" />
                  </span>
                </div>
              ))}
            </div>
          )}
          {healthyFilter.length > 0 && (
            <div className="workspace-widget__toolbar-seletced-filters-item">
              <span className="workspace-widget__toolbar-seletced-filters-item-label">
                Healthy:
              </span>
              {healthyFilter.map((h, index) => (
                <div
                  className="workspace-widget__toolbar-seletced-filters-item-value"
                  key={getRenderKey(h, index, "health-filter")}
                >
                  {h.name}
                  <span
                    className="workspace-widget__toolbar-seletced-filters-item-close"
                    onClick={() =>
                      setHealthyFilter(healthyFilter.filter((f) => f.id !== h.id))
                    }
                  >
                    <img src={closeIcon} alt="close" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {apiLoading && (viewMode === "list" || layout === "new") ? (
        <div className="workspace-widget__list">
          <Table
            columns={columns}
            columnData={[]}
            globalFilter={""}
            setFilter={() => {}}
            className="products__body-table workspace_table"
            tableName="workspace_list"
            enableRowSelection={false}
            loading={apiLoading}
            skeletonRowCount={8}
            noDataContent="No Tasks Found"
            tdActionFn={false}
            onRowClick={handleWorkspaceTableRowClick}
          />
        </div>
      ) : apiLoading ? (
        fromPage === "board" ? (
          <div
            className="workspace-widget__active-boards-list workspace-widget__active-boards-list--loading"
            role="status"
            aria-busy="true"
            aria-label="Loading active boards"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`active-board-skel-${index}`}
                className="workspace-widget__active-board-card workspace-widget__active-board-card--skeleton"
              />
            ))}
          </div>
        ) : (
          <WorkspaceCardSkeleton
            count={4}
            columns={viewWidth > 0 && viewWidth < 870 ? 2 : 4}
            ariaLabel="Loading workspace cards"
          />
        )
      ) : filteredCards?.length > 0 && viewMode === "grid" ? (
        fromPage === "board" ? (
          <div className="workspace-widget__active-boards-list">
            {renderActiveBoardCards()}
          </div>
        ) : (
          <div
            className={`workspace-widget__grid ${viewWidth < 870 ? "template-columns-2" : "template-columns-4"}`}
            ref={gridRef}
          >
            {renderWorkspaceCards()}
          </div>
        )
      ) : viewMode === "list" || layout === "new" ? (
        <div className="workspace-widget__list">
          <Table
            columns={columns}
            columnData={filteredCards}
            // sorting={sorting}
            // setSorting={setSorting}
            // onSortingChange={() => {}}
            globalFilter={""}
            setFilter={() => {}}
            className="products__body-table workspace_table"
            tableName="workspace_list"
            enableRowSelection={false}
            loading={apiLoading}
            skeletonRowCount={8}
            noDataContent="No Tasks Found"
            tdActionFn={false}
            onRowClick={handleWorkspaceTableRowClick}
          />
        </div>
      ) : (
        <div
          className={
            fromPage === "board"
              ? "workspace-widget__active-boards-list workspace-widget__active-boards-list--empty"
              : "workspace-widget__no-data"
          }
        >
          <p className="workspace-widget__no-data-found w-100">No Data Found</p>
        </div>
      )}
    </section>
  );
};

export default memo(WorkspaceWidget);
