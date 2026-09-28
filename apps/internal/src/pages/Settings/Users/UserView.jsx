import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { useGlobalContext } from "store/context/GlobalProvider";
import {
  getUserBoardPermission,
  addUserBoardPermission,
  getUserKnowledgeBasePermission,
  addUserKnowledgeBasePermission,
  getUserAppPermission,
  addUserAppPermission,
} from "../../../services";
import { useToast } from "@orion/shared";
import LogoAvatarShowLetter from "../../../components/common/LogoAvatarShowLetter";
import { Link } from "react-router-dom";
import TabComponent from "../../../components/common/TabComponent";
import { t } from "i18next";
import { SelectDropDown } from "@orion/shared";
import SearchableInput from "../../../components/common/Dynamic/SearchableInput";
import Table from "../../../components/common/Table";
import { createColumnHelper } from "@tanstack/react-table";
import { useGlobalMaster } from "@orion/shared";
import {
  mapLocationIcon,
  companyIcon,
  emailIconNew,
  pencilSimpleLine,
  trashFull,
  TimerIcon,
} from "../../../assets/images/index";
import { useRef } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import CreateUser from "./CreateUser";
import {
  asArray,
  formatDisplayDate,
  isKbApiSuccess,
  normalizeKbPermissionRow,
  toCanEditFlag,
} from "pages/KnowledgeBase/utils";
import useKnowledgeBase from "hooks/useKnowledgeBase";

/** UI labels mapped to canEdit 0|1 */
const KB_PERMISSION_OPTIONS = [
  { id: 0, name: "View", canEdit: 0 },
  { id: 1, name: "Edit", canEdit: 1 },
];

/** App access: permission 1 = granted, 0 = revoked */
const APP_PERMISSION_OPTIONS = [
  { id: 1, name: "Access", permission: 1 },
];

const getAppPermissionMasterId = (item) =>
  item?.appId ??
  item?.app_id ??
  item?.status_id ??
  item?.statusId ??
  item?.id ??
  item?.appPermissionId ??
  null;

const getAppPermissionMasterName = (item) =>
  item?.name ?? item?.status_name ?? item?.appName ?? item?.app_name ?? item?.code ?? "—";

const toAppPermissionFlag = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value).toLowerCase() === "true"
    ? 1
    : 0;

const appPermissionLabel = (value) =>
  toAppPermissionFlag(value) === 1 ? "Access" : "—";

const normalizeAppPermissionRow = (row, masterById = new Map()) => {
  const appId = getAppPermissionMasterId(row);
  const hasPermissionField =
    row?.permission != null ||
    row?.isSelected != null ||
    row?.is_selected != null;
  const permission = hasPermissionField
    ? toAppPermissionFlag(row?.permission ?? row?.isSelected ?? row?.is_selected)
    : 1;
  const master = appId != null ? masterById.get(String(appId)) : null;
  const grantedByRaw = row?.grantedBy ?? row?.granted_by;
  const rawName = getAppPermissionMasterName(row);
  return {
    ...row,
    id:
      row?.new_user_app_permission_id ??
      row?.userAppPermissionId ??
      row?.user_app_permission_id ??
      row?.id ??
      null,
    userAppPermissionId:
      row?.new_user_app_permission_id ??
      row?.userAppPermissionId ??
      row?.user_app_permission_id ??
      row?.id ??
      null,
    appId,
    appPermissionId: appId,
    permission,
    permissionLabel: appPermissionLabel(permission),
    appName: rawName !== "—" ? rawName : getAppPermissionMasterName(master),
    grantedBy:
      typeof grantedByRaw === "object"
        ? grantedByRaw?.name ?? grantedByRaw?.userName ?? "—"
        : grantedByRaw ?? "—",
    grantedOn: row?.grantedOn ?? row?.granted_on ?? "",
  };
};

const isAppPermissionApiSuccess = (response) => {
  if (response?.status === false || response?.data?.status === false) return false;
  if (response?.status === true || response?.data?.status === true) return true;
  return Boolean(response?.data || response?.status === 200);
};

const UserView = ({
  userData,
  showUserListTable,
  selectedFilters,
  listLabel = "Workspace User",
  isAdminUser = false,
}) => {
  const columnHelper = createColumnHelper();
  const [showBoardApiLoading, setShowBoardApiLoading] = useState(false);
  const [showTicketApiLoading, setShowTicketApiLoading] = useState(false);
  const [getUserData, setGetUserData] = useState([]);
  const [addWorkspace, setWorkspace] = useState([]);
  const [addBoard, setAddBoard] = useState([]);
  const [addRole, setAddRole] = useState([]);
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [kbPermissions, setKbPermissions] = useState([]);
  const [kbPermissionsLoading, setKbPermissionsLoading] = useState(false);
  const [kbPermissionSaving, setKbPermissionSaving] = useState(false);
  const [selectedKb, setSelectedKb] = useState([]);
  const [selectedKbLevel, setSelectedKbLevel] = useState([]);
  const [editingKbPermId, setEditingKbPermId] = useState(null);
  const [showKbDeleteModal, setShowKbDeleteModal] = useState(false);
  const [selectedKbRow, setSelectedKbRow] = useState(null);
  const [appPermissions, setAppPermissions] = useState([]);
  const [appPermissionsLoading, setAppPermissionsLoading] = useState(false);
  const [appPermissionSaving, setAppPermissionSaving] = useState(false);
  const [selectedApp, setSelectedApp] = useState([]);
  const [selectedAppLevel, setSelectedAppLevel] = useState([]);
  const [editingAppPermId, setEditingAppPermId] = useState(null);
  const [showAppDeleteModal, setShowAppDeleteModal] = useState(false);
  const [selectedAppRow, setSelectedAppRow] = useState(null);
  const isFetchingKbPermissionRef = useRef(false);
  const isFetchingAppPermissionRef = useRef(false);
  const {
    countryList,
    allTeamList,
    allWorkspaceList,
    designationList,
    boardList,
    getBoardList,
    getAllWorkSpaceList,
    userRole,
    getUserRoleList,
    getDesignationList,
    roleList,
    appPermissionList,
    getAppPermissionList,
  } = useGlobalMaster();
  const [{ allRows: kbCatalogRows, loading: kbCatalogLoading }] =
    useKnowledgeBase();
  const { workSpaceUserList, userBoardPermission, dispatch } = useGlobalContext();
  const isFetchingInstrumentRef = useRef(false);
  const isAddingUserBoardPermission = useRef(false);

  const fetchUserKbPermission = async (regId) => {
    if (!regId || isFetchingKbPermissionRef.current) return;
    try {
      isFetchingKbPermissionRef.current = true;
      setKbPermissionsLoading(true);
      const response = await getUserKnowledgeBasePermission({ regId });
      if (isKbApiSuccess(response)) {
        const list = asArray(response?.data);
        setKbPermissions(list.map(normalizeKbPermissionRow));
      } else {
        setKbPermissions([]);
      }
    } catch (error) {
      setKbPermissions([]);
      if (error?.response?.status !== 404) {
        showToast({
          message: error?.message || "Failed to get knowledge base permissions.",
          variant: "danger",
        });
      }
    } finally {
      setKbPermissionsLoading(false);
      isFetchingKbPermissionRef.current = false;
    }
  };

  const appPermissionMasterById = useMemo(() => {
    const map = new Map();
    asArray(appPermissionList?.data).forEach((item) => {
      const id = getAppPermissionMasterId(item);
      if (id == null) return;
      map.set(String(id), item);
    });
    return map;
  }, [appPermissionList?.data]);

  const fetchUserAppPermission = async (regId) => {
    if (!regId || isFetchingAppPermissionRef.current) return;
    try {
      isFetchingAppPermissionRef.current = true;
      setAppPermissionsLoading(true);
      const response = await getUserAppPermission({ regId });
      if (isAppPermissionApiSuccess(response)) {
        const list = asArray(response?.data ?? response?.data?.data);
        setAppPermissions(
          list
            .map((row) => normalizeAppPermissionRow(row, appPermissionMasterById))
            .filter((row) => Number(row.permission) === 1),
        );
      } else {
        setAppPermissions([]);
      }
    } catch (error) {
      setAppPermissions([]);
      if (error?.response?.status !== 404) {
        showToast({
          message: error?.message || t("settings.app_permission_load_failed"),
          variant: "danger",
        });
      }
    } finally {
      setAppPermissionsLoading(false);
      isFetchingAppPermissionRef.current = false;
    }
  };

  useEffect(() => {
    getUserRoleList();
    getAppPermissionList();
    if (designationList?.data.length === 0) {
      getDesignationList();
    }
    if (!allWorkspaceList?.loading && !allWorkspaceList?.data?.length) {
      getAllWorkSpaceList();
    }
    if (!boardList?.loading && !boardList?.data?.length) {
      getBoardList();
    }
  }, []);

  const getWorkspaceBoardIds = (workspace) => {
    if (!workspace) return [];
    if (Array.isArray(workspace.board_ids) && workspace.board_ids.length) {
      return workspace.board_ids;
    }
    if (Array.isArray(workspace.boardIds) && workspace.boardIds.length) {
      return workspace.boardIds;
    }
    const nestedBoards = workspace.boardList || workspace.boards || [];
    return nestedBoards
      .map((board) => board.boardID ?? board.boardId ?? board.id)
      .filter((id) => id != null);
  };

  const getBoardsForSelectedWorkspace = () => {
    const workspace = addWorkspace[0];
    if (!workspace) return [];
    const allBoards = boardList?.data || [];
    const nestedBoards = workspace.boardList || workspace.boards || [];
    const boardIds = getWorkspaceBoardIds(workspace);
    if (boardIds.length) {
      const idSet = new Set(boardIds.map((id) => String(id)));
      const matched = allBoards.filter((board) => idSet.has(String(board.boardID)));
      if (matched.length) return matched;
      if (nestedBoards.length) return nestedBoards;
    }
    const workspaceId = workspace.work_space_id ?? workspace.workspaceId;
    return allBoards.filter(
      (board) =>
        String(board.work_space_id ?? board.workspaceId ?? board.workspace_id) ===
        String(workspaceId),
    );
  };

  const kbMasterOptions = useMemo(() => {
    const assignedIds = new Set(
      kbPermissions
        .filter((p) => String(p.id) !== String(editingKbPermId))
        .map((p) => String(p.knowledgeBaseId)),
    );
    return kbCatalogRows.map((kb) => ({
      id: kb.id,
      name: kb.name,
      disabled: assignedIds.has(String(kb.id)),
    }));
  }, [editingKbPermId, kbPermissions, kbCatalogRows]);

  const updateUserDetails = (updatedResult) => {
    dispatch({
      type: "SET_USERLIST_DATA",
      payload: updatedResult,
    });
  };
  const getUserList = async (updatedUserData) => {
    const updatedData = {
      ...getUserData[0],
      country: updatedUserData.countryId,
      designation: updatedUserData.designationId,
      team: updatedUserData.teamId,
      shiftTime: updatedUserData.shiftTime,
    };
    const updatedList = workSpaceUserList.userList.map(
      (user) =>
        user.userProfileId === userData[0].userProfileId
          ? { ...user, ...updatedData } // update the matching one
          : user, // keep others as is
    );
    const updatedResult = {
      ...workSpaceUserList,
      userItems: updatedList,
    };
    updateUserDetails(updatedResult);
  };

  const fetchAddUserBoardTicketPermission = async (param, name) => {
    if (isAddingUserBoardPermission.current) return; // Prevent multiple calls
    try {
      if (name === "board") {
        setShowBoardApiLoading(true);
        isAddingUserBoardPermission.current = true; // Block further fetches
        const response = await addUserBoardPermission(param);
        if (response.status) {
          showToast({
            message: response?.data?.message || "User Board Added",
            variant: "success",
          });
          fetchUserBoardPermission(getUserData[0]?.userInfo?.regId);
          setShowBoardApiLoading(false);
        } else {
          setShowBoardApiLoading(false);
        }
      } else {
        setShowTicketApiLoading(false);
      }
    } catch (error) {
      showToast({
        message: error?.message || "Failed to Add Data.",
        variant: "danger",
      });
      setShowBoardApiLoading(false);
      setShowTicketApiLoading(false);
    } finally {
      isAddingUserBoardPermission.current = false;
    }
  };

  function mergeBoardsWithPermission(boardList, userBoardPermission) {
    return (
      boardList?.map((board) => {
        const matched = userBoardPermission?.userBoards?.find(
          (ub) => ub.board_id === board.boardID,
        );

        return {
          ...board,
          disabled: Boolean(matched), // true if board exists in permissions
        };
      }) || []
    );
  }

  const boardFormLabels = [
    {
      label: t("settings.workspace"),
      iconPlacement: 1,
      value: addWorkspace,
      options: allWorkspaceList?.data || [],
      typeof: "dropDown",
      key: "workspace",
      labelField: "name",
      valueField: "work_space_id",
    },
    {
      label: t("settings.board"),
      iconPlacement: 1,
      value: addBoard,
      options: mergeBoardsWithPermission(
        getBoardsForSelectedWorkspace(),
        userBoardPermission,
      ),
      typeof: "dropDown",
      key: "board",
      labelField: "name",
      valueField: "boardID",
      disabled: addWorkspace.length === 0 || getBoardsForSelectedWorkspace().length === 0,
    },
    ...(!isAdminUser
      ? [
          {
            label: t("settings.role"),
            iconPlacement: 1,
            value: addRole,
            options: userRole?.data || [],
            typeof: "dropDown",
            key: "role",
            labelField: "roleName",
            valueField: "roleId",
            disabled: addBoard.length === 0,
          },
        ]
      : []),
  ];

  const canAddBoardPermission =
    addWorkspace.length > 0 &&
    addBoard.length > 0 &&
    (isAdminUser || addRole.length > 0);

  const knowledgeBaseFormLabels = [
    {
      label: t("settings.knowledge_base"),
      value: selectedKb,
      options: kbMasterOptions,
      key: "knowledgeBase",
      labelField: "name",
      valueField: "id",
    },
    {
      label: t("settings.permissions"),
      value: selectedKbLevel,
      options: KB_PERMISSION_OPTIONS,
      key: "kbPermission",
      labelField: "name",
      valueField: "canEdit",
      disabled: selectedKb.length === 0,
    },
  ];

  // Delete Confirmation and store selected Row
  const handleDeleteConfirm = (data) => {
    setSelectedRow(data);
    setShowDeleteModal(true);
  };

  const resetKbPermissionForm = () => {
    setSelectedKb([]);
    setSelectedKbLevel([]);
    setEditingKbPermId(null);
  };

  const resetAppPermissionForm = () => {
    setSelectedApp([]);
    setSelectedAppLevel([]);
    setEditingAppPermId(null);
  };

  const addPermission = (name) => {
    if (name === "board") {
      if (!canAddBoardPermission) return;
      const paramData = {
        userBoardPermissionId: 0,
        userId: getUserData[0]?.userInfo?.regId,
        workspaceId: addWorkspace[0].work_space_id,
        boardId: addBoard[0].boardID,
        roleId: isAdminUser ? null : addRole[0]?.roleId,
        isAdmin: Boolean(isAdminUser),
      };
      fetchAddUserBoardTicketPermission(paramData, name);
      setWorkspace([]);
      setAddBoard([]);
      setAddRole([]);
    }
  };

  const addOrUpdateKbPermission = async () => {
    const kb = selectedKb?.[0];
    const level = selectedKbLevel?.[0];
    const userId = getUserData[0]?.userInfo?.regId;
    if (!kb?.id || selectedKbLevel.length === 0 || !userId) {
      showToast({
        message: t("settings.kb_permission_validation"),
        variant: "warning",
      });
      return;
    }

    const payload = {
      userKnowledgeBasePermissionId: editingKbPermId || 0,
      userId,
      knowledgeBaseId: kb.id,
      canEdit: toCanEditFlag(level.canEdit ?? level.id),
    };

    setKbPermissionSaving(true);
    try {
      const response = await addUserKnowledgeBasePermission(payload);
      if (!isKbApiSuccess(response)) {
        throw new Error(
          response?.message || response?.data?.message || "Failed to save permission",
        );
      }
      await fetchUserKbPermission(userId);
      showToast({
        message: editingKbPermId
          ? t("settings.kb_permission_updated")
          : t("settings.kb_permission_added"),
        variant: "success",
      });
      resetKbPermissionForm();
    } catch (error) {
      showToast({
        message: error?.message || t("settings.kb_permission_validation"),
        variant: "danger",
      });
    } finally {
      setKbPermissionSaving(false);
    }
  };

  const startEditKbPermission = (row) => {
    const kbOption = kbMasterOptions.find(
      (opt) => String(opt.id) === String(row.knowledgeBaseId),
    ) || {
      id: row.knowledgeBaseId,
      name: row.knowledgeBaseName,
      disabled: false,
    };
    const levelOption =
      KB_PERMISSION_OPTIONS.find(
        (opt) => Number(opt.canEdit) === Number(row.canEdit),
      ) || KB_PERMISSION_OPTIONS[0];
    setEditingKbPermId(
      row.userKnowledgeBasePermissionId ?? row.id,
    );
    setSelectedKb([kbOption]);
    setSelectedKbLevel([levelOption]);
  };

  const confirmRemoveKbPermission = (row) => {
    setSelectedKbRow(row);
    setShowKbDeleteModal(true);
  };

  const removeKbPermission = async () => {
    const userId = getUserData[0]?.userInfo?.regId;
    const permissionId =
      selectedKbRow?.userKnowledgeBasePermissionId ?? selectedKbRow?.id;
    if (!permissionId || !userId) return;

    setKbPermissionSaving(true);
    try {
      const response = await addUserKnowledgeBasePermission({
        userKnowledgeBasePermissionId: permissionId,
        userId,
        knowledgeBaseId: null,
        canEdit: null,
      });
      if (!isKbApiSuccess(response)) {
        throw new Error(
          response?.message || response?.data?.message || "Failed to remove permission",
        );
      }
      if (String(editingKbPermId) === String(permissionId)) {
        resetKbPermissionForm();
      }
      setShowKbDeleteModal(false);
      setSelectedKbRow(null);
      await fetchUserKbPermission(userId);
      showToast({
        message: t("settings.kb_permission_removed"),
        variant: "success",
      });
    } catch (error) {
      showToast({
        message: error?.message || t("settings.kb_permission_validation"),
        variant: "danger",
      });
    } finally {
      setKbPermissionSaving(false);
    }
  };

  const appMasterOptions = useMemo(() => {
    const assignedIds = new Set(
      appPermissions
        .filter((p) => String(p.userAppPermissionId ?? p.id) !== String(editingAppPermId))
        .map((p) => String(p.appId ?? p.appPermissionId)),
    );
    return asArray(appPermissionList?.data)
      .map((item) => {
        const id = getAppPermissionMasterId(item);
        if (id == null) return null;
        return {
          ...item,
          id,
          name: getAppPermissionMasterName(item),
          disabled: assignedIds.has(String(id)),
        };
      })
      .filter(Boolean);
  }, [appPermissionList?.data, appPermissions, editingAppPermId]);

  const appFormLabels = [
    {
      label: t("settings.application"),
      value: selectedApp,
      options: appMasterOptions,
      key: "application",
      labelField: "name",
      valueField: "id",
    },
    {
      label: t("settings.permissions"),
      value: selectedAppLevel,
      options: APP_PERMISSION_OPTIONS,
      key: "appPermissionLevel",
      labelField: "name",
      valueField: "permission",
      disabled: selectedApp.length === 0,
    },
  ];

  const addOrUpdateAppPermission = async () => {
    const app = selectedApp?.[0];
    const level = selectedAppLevel?.[0];
    const userId = getUserData[0]?.userInfo?.regId;
    const appId = getAppPermissionMasterId(app);
    if (appId == null || selectedAppLevel.length === 0 || !userId) {
      showToast({
        message: t("settings.app_permission_validation"),
        variant: "warning",
      });
      return;
    }

    setAppPermissionSaving(true);
    try {
      const payload = {
        userId,
        appId: Number(appId),
        permission: toAppPermissionFlag(level?.permission ?? level?.id),
      };
      const response = await addUserAppPermission(payload);
      if (!isAppPermissionApiSuccess(response)) {
        throw new Error(
          response?.message ||
            response?.data?.message ||
            t("settings.app_permission_save_failed"),
        );
      }
      await fetchUserAppPermission(userId);
      showToast({
        message:
          response?.data?.message ||
          (editingAppPermId
            ? t("settings.app_permission_updated")
            : t("settings.app_permission_added")),
        variant: "success",
      });
      resetAppPermissionForm();
    } catch (error) {
      showToast({
        message: error?.message || t("settings.app_permission_save_failed"),
        variant: "danger",
      });
    } finally {
      setAppPermissionSaving(false);
    }
  };

  const startEditAppPermission = (row) => {
    const appOption =
      appMasterOptions.find((opt) => String(opt.id) === String(row.appId)) || {
        id: row.appId,
        name: row.appName,
        disabled: false,
      };
    const levelOption =
      APP_PERMISSION_OPTIONS.find(
        (opt) => Number(opt.permission) === Number(row.permission),
      ) || APP_PERMISSION_OPTIONS[0];
    setEditingAppPermId(row.userAppPermissionId ?? row.id);
    setSelectedApp([appOption]);
    setSelectedAppLevel([levelOption]);
  };

  const confirmRemoveAppPermission = (row) => {
    setSelectedAppRow(row);
    setShowAppDeleteModal(true);
  };

  const removeAppPermission = async () => {
    const userId = getUserData[0]?.userInfo?.regId;
    const appId = selectedAppRow?.appId ?? selectedAppRow?.appPermissionId;
    if (appId == null || !userId) return;

    setAppPermissionSaving(true);
    try {
      const response = await addUserAppPermission({
        userId,
        appId: Number(appId),
        permission: 0,
      });
      if (!isAppPermissionApiSuccess(response)) {
        throw new Error(
          response?.message ||
            response?.data?.message ||
            t("settings.app_permission_save_failed"),
        );
      }
      if (
        String(editingAppPermId) ===
        String(selectedAppRow?.userAppPermissionId ?? selectedAppRow?.id)
      ) {
        resetAppPermissionForm();
      }
      setShowAppDeleteModal(false);
      setSelectedAppRow(null);
      await fetchUserAppPermission(userId);
      showToast({
        message:
          response?.data?.message || t("settings.app_permission_removed"),
        variant: "success",
      });
    } catch (error) {
      showToast({
        message: error?.message || t("settings.app_permission_save_failed"),
        variant: "danger",
      });
    } finally {
      setAppPermissionSaving(false);
    }
  };

  // delete user after confirmation
  const deleteUser = (userData) => {
    const paramData = {
      userBoardPermissionId: userData?.user_board_permission_id,
      userId: getUserData[0]?.userInfo?.regId,
      workspaceId: null,
      boardId: null,
      roleId: 0,
      isAdmin: Boolean(isAdminUser),
    };

    setShowDeleteModal(false);
    fetchAddUserBoardTicketPermission(paramData, "board");
  };

  const CustomBreadcrumb = ({ getName, showUserListTable, listLabel }) => {
    const changeRoot = () => {
      showUserListTable(false);
    };
    return (
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb custom-userInfo">
          <li
            key={`breadcrumb-item-${1}`}
            className={`breadcrumb-item ${`active`} `}
            aria-current="page"
            title={""}
            onClick={changeRoot}
          >
            <Link to={""}>{listLabel}</Link>
            <span className="breadcrumb-item-divider">
              {" "}
              <span className="icon-chevron-thin-right"></span>{" "}
            </span>
          </li>
          <li key={`breadcrumb-item-${2}`} className="breadcrumb-item">
            <Link to="" onClick={(e) => e.preventDefault()}>
              {getName}
            </Link>
          </li>
        </ol>
      </nav>
    );
  };

  const handleUserInfoForm = (e, fieldName) => {
    switch (fieldName) {
      case "workspace":
        setWorkspace(e || []);
        setAddBoard([]);
        setAddRole([]);
        break;
      case "board":
        setAddBoard(e || []);
        break;

      case "role":
        setAddRole(e || []);
        break;

      case "knowledgeBase":
        setSelectedKb(e || []);
        if (!e?.length) setSelectedKbLevel([]);
        break;

      case "kbPermission":
        setSelectedKbLevel(e || []);
        break;

      case "application":
        setSelectedApp(e || []);
        if (!e?.length) setSelectedAppLevel([]);
        break;

      case "appPermissionLevel":
        setSelectedAppLevel(e || []);
        break;

      default:
        console.warn("Unknown fieldName:", fieldName);
    }
  };

  const BoardPermissions = () => {
    const CustomColumns = [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
        ),
        cell: (info) => {
          const rowIndex = info.row.index; // index on current page
          return rowIndex + 1; // 1-based serial number
        },
        canSort: false,
      }),
      columnHelper.accessor("workspace_name", {
        header: () => t("settings.workspace"),
        cell: (info) => {
          const rowData = info.row.original;
          return allWorkspaceList?.data?.filter(
            (workSpace) => workSpace.work_space_id === rowData.workspace_id,
          )[0].name;
        },
      }),
      columnHelper.accessor("board_name", {
        header: () => t("settings.board_permissions"),
        cell: (info) => {
          const rowData = info.row.original;
          return boardList?.data?.filter((board) => board?.boardID === rowData?.board_id)[0]
            .name;
        },
      }),
      columnHelper.accessor("role_name", {
        header: () => t("settings.role"),
        cell: (info) => {
          const rowData = info.row.original;
          return (
            <span
              className={
                "role_" +
                userRole?.data
                  ?.filter((role) => role?.roleId === rowData?.role_id)?.[0]
                  ?.roleName?.toString()
                  .replaceAll(" ", "_")
                  ?.toLowerCase() || "member"
              }
            >
              {
                userRole?.data?.filter((role) => role?.roleId === rowData?.role_id)?.[0]
                  ?.roleName
              }
            </span>
          );
        },
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const rowData = info.row.original;
          return (
            <div className="mx-auto w-100">
              <button
                className="btn btn-0 p-0 m-0 w-100 border-0 text-danger"
                onClick={() => handleDeleteConfirm(rowData)}
              >
                <img src={trashFull} alt="Remove Instrument" />
              </button>
            </div>
          );
        },
        canSort: false,
      }),
    ];

    return (
      <Fragment>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto p-4">
          <Col className="p-0">
            <h4 className="form-header mb-3">Add Board Permission</h4>
            <div className="form-Container">
              <Row className="d-flex flex-row align-items-end row-gap-3 flex-wrap">
                {boardFormLabels.map((val, index) => {
                  return (
                    <Col xs={3} key={index}>
                      <label className="label-header">
                        {val?.label} <span className="text-danger">*</span>{" "}
                      </label>
                      <SelectDropDown
                        id={val.key}
                        multi={false}
                        options={val.options}
                        labelField={val.labelField}
                        valueField={val.valueField}
                        searchable={true}
                        values={val.value}
                        onChange={(e) => handleUserInfoForm(e, val.key)}
                        placeholder={`Choose ${val.label}`}
                        className="multiple-select mt-2 filter-select-dropDown"
                        // optionType={item.optionType}
                        // nestedList={item.nestedList}
                        disabled={val.disabled}
                        dropdownPosition="auto"
                      // errorMsg={item.isMandatory && errorMsg?.[item.key]}
                      // isInvalid={!!errorMsg?.[item.key]}
                      />
                    </Col>
                  );
                })}
                <Col xs={3}>
                  <button
                    className="btn add_user_btn"
                    onClick={() => addPermission("board")}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addPermission("board");
                      }
                    }}
                    disabled={!canAddBoardPermission}
                  >
                    {" "}
                    {`Add${showBoardApiLoading ? "ing" : "  Permission"}`}{" "}
                    {showBoardApiLoading && (
                      <>
                        &#160;
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto p-4 mt-4">
          <h4 className="form-header mb-3 p-0">Board Permission</h4>
          <div className="tableSection p-0">
            <Table
              columns={CustomColumns}
              columnData={userBoardPermission?.userBoards || []}
              // getDatas={getCard}
              className={"products__body-table userPermission_table"}
              //   onSortingChange={handleSortingChange}
              //   sorting={sorting}
              //   setSorting={setSorting}
              tableName={"Order_list"}
            //   noDataContent={
            //     totalOrders === 0 && !isFiltered
            //       ? renderEmptyContent
            //       : renderNoResultsFound
            //   }
            //   tableHeight={props?.tableHeight}
            //   loading={props?.loading}
            //   onScrollEnd={handleInfiniteScroll}
            />
            <PopupModal
              show={showDeleteModal}
              onClose={setShowDeleteModal}
              className={"deleteConfirmModal"}
            // header={false}
            >
              <div className="deleteConfirmation">
                <div className="w-100 mx-auto">
                  <h5 className="text-danger text-center">Confirm Deletion</h5>
                  <p className="text-center">
                    Deleting{" "}
                    <b>
                      {
                        allWorkspaceList?.data?.filter(
                          (workSpace) =>
                            workSpace.work_space_id === selectedRow?.workspace_id,
                        )[0]?.name
                      }
                    </b>{" "}
                    will remove all their access and related permissions.
                  </p>
                </div>
                <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
                  <button
                    className="btn btn-0 yes_btn px-4 rounded"
                    onClick={() => deleteUser(selectedRow)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        deleteUser(selectedRow);
                      }
                    }}
                  >
                    Yes
                  </button>
                  <button
                    className="btn btn-0 no_btn px-4 rounded"
                    onClick={() => {
                      setSelectedRow(null);
                      setShowDeleteModal(false);
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSelectedRow(null);
                        setShowDeleteModal(false);
                      }
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            </PopupModal>
          </div>
        </Row>
      </Fragment>
    );
  };

  const KnowledgeBasePermissions = () => {
    const CustomColumns = [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
        ),
        cell: (info) => info.row.index + 1,
        canSort: false,
      }),
      columnHelper.accessor("knowledgeBaseName", {
        header: () => t("settings.knowledge_base"),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("permission", {
        header: () => t("settings.permissions"),
        cell: (info) => {
          const value = info.getValue();
          return (
            <span
              className={`kb-permission-badge kb-permission-badge--${String(value || "")
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {value || "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("grantedBy", {
        header: () => t("settings.granted_by"),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("grantedOn", {
        header: () => t("settings.granted_on"),
        cell: (info) => formatDisplayDate(info.getValue()),
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.edit")}
                onClick={() => startEditKbPermission(row)}
              >
                <img src={pencilSimpleLine} alt="" />
              </button>
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.delete")}
                onClick={() => confirmRemoveKbPermission(row)}
              >
                <img src={trashFull} alt="" />
              </button>
            </div>
          );
        },
        canSort: false,
      }),
    ];

    return (
      <Fragment>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto p-4">
          <Col className="p-0">
            <h4 className="form-header mb-3">
              {editingKbPermId
                ? t("settings.edit_knowledge_base_permission")
                : t("settings.add_knowledge_base_permission")}
            </h4>
            <div className="form-Container">
              <Row className="d-flex flex-row align-items-end row-gap-3 flex-wrap">
                {knowledgeBaseFormLabels.map((val, index) => {
                  return (
                    <Col xs={3} key={index}>
                      <label className="label-header">
                        {val?.label} <span className="text-danger">*</span>{" "}
                      </label>
                      <SelectDropDown
                        id={val.key}
                        multi={false}
                        options={val.options}
                        labelField={val.labelField}
                        valueField={val.valueField}
                        searchable={true}
                        values={val.value}
                        onChange={(e) => handleUserInfoForm(e, val.key)}
                        placeholder={`Choose ${val.label}`}
                        className="multiple-select mt-2 filter-select-dropDown"
                        disabled={val.disabled}
                        dropdownPosition="auto"
                      />
                    </Col>
                  );
                })}
                <Col xs={3} className="d-flex gap-2">
                  <button
                    className="btn add_user_btn"
                    onClick={addOrUpdateKbPermission}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addOrUpdateKbPermission();
                      }
                    }}
                    disabled={
                      kbPermissionSaving ||
                      !(selectedKb.length > 0 && selectedKbLevel.length > 0)
                    }
                  >
                    {editingKbPermId
                      ? t("settings.update_permission")
                      : t("settings.add_permission")}
                  </button>
                  {editingKbPermId && (
                    <button
                      type="button"
                      className="btn cancel_btn px-3"
                      onClick={resetKbPermissionForm}
                    >
                      {t("common.cancel")}
                    </button>
                  )}
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto shadow-sm p-4 mt-4">
          <h4 className="form-header mb-3 p-0">
            {t("settings.knowledge_base_permissions")}
          </h4>
          <div className="tableSection p-0">
            <Table
              columns={CustomColumns}
              columnData={kbPermissions}
              className={"products__body-table userPermission_table"}
              tableName={"Order_list"}
              noDataContent={t("settings.kb_permission_empty")}
              loading={kbCatalogLoading || kbPermissionsLoading}
            />
            <PopupModal
              show={showKbDeleteModal}
              onClose={() => {
                setShowKbDeleteModal(false);
                setSelectedKbRow(null);
              }}
              className={"deleteConfirmModal"}
            >
              <div className="deleteConfirmation">
                <div className="w-100 mx-auto">
                  <h5 className="text-danger text-center">
                    {t("settings.confirm_deletion")}
                  </h5>
                  <p className="text-center">
                    {t("settings.kb_permission_delete_prefix")}{" "}
                    <b>{selectedKbRow?.knowledgeBaseName}</b>
                    {t("settings.kb_permission_delete_suffix")}
                  </p>
                </div>
                <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
                  <button
                    className="btn btn-0 yes_btn px-4 rounded"
                    onClick={removeKbPermission}
                  >
                    {t("common.yes")}
                  </button>
                  <button
                    className="btn btn-0 no_btn px-4 rounded"
                    onClick={() => {
                      setSelectedKbRow(null);
                      setShowKbDeleteModal(false);
                    }}
                  >
                    {t("common.no")}
                  </button>
                </div>
              </div>
            </PopupModal>
          </div>
        </Row>
      </Fragment>
    );
  };

  const handleSearch = (value, key) => {
    const val = { userInfo: value };
  };

  const AppPermissions = () => {
    const CustomColumns = [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">{t("order_orion_v2.s_no")}</span>
        ),
        cell: (info) => info.row.index + 1,
        canSort: false,
      }),
      columnHelper.accessor("appName", {
        header: () => t("settings.application"),
        cell: (info) => {
          const row = info.row.original;
          if (row.appName && row.appName !== "—") return row.appName;
          return getAppPermissionMasterName(
            appPermissionMasterById.get(String(row.appId)),
          );
        },
      }),
      columnHelper.accessor("permissionLabel", {
        header: () => t("settings.permissions"),
        cell: (info) => {
          const value = info.getValue();
          return (
            <span
              className={`kb-permission-badge kb-permission-badge--${String(value || "")
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {value || "—"}
            </span>
          );
        },
      }),
      // columnHelper.accessor("grantedBy", {
      //   header: () => t("settings.granted_by"),
      //   cell: (info) => info.getValue() || "—",
      // }),
      // columnHelper.accessor("grantedOn", {
      //   header: () => t("settings.granted_on"),
      //   cell: (info) => formatDisplayDate(info.getValue()),
      // }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="d-flex justify-content-center align-items-center gap-2">
              {/* <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.edit")}
                onClick={() => startEditAppPermission(row)}
              >
                <img src={pencilSimpleLine} alt="" />
              </button> */}
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.delete")}
                onClick={() => confirmRemoveAppPermission(row)}
              >
                <img src={trashFull} alt="" />
              </button>
            </div>
          );
        },
        canSort: false,
      }),
    ];

    return (
      <Fragment>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto p-4">
          <Col className="p-0">
            <h4 className="form-header mb-3">
              {editingAppPermId
                ? t("settings.edit_app_permission")
                : t("settings.add_app_permission")}
            </h4>
            <div className="form-Container">
              <Row className="d-flex flex-row align-items-end row-gap-3 flex-wrap">
                {appFormLabels.map((val, index) => (
                  <Col xs={3} key={index}>
                    <label className="label-header">
                      {val?.label} <span className="text-danger">*</span>{" "}
                    </label>
                    <SelectDropDown
                      id={val.key}
                      multi={false}
                      options={val.options}
                      labelField={val.labelField}
                      valueField={val.valueField}
                      searchable={true}
                      values={val.value}
                      onChange={(e) => handleUserInfoForm(e, val.key)}
                      placeholder={`Choose ${val.label}`}
                      className="multiple-select mt-2 filter-select-dropDown"
                      disabled={val.disabled}
                      dropdownPosition="auto"
                    />
                  </Col>
                ))}
                <Col xs={3} className="d-flex gap-2">
                  <button
                    className="btn add_user_btn"
                    onClick={addOrUpdateAppPermission}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addOrUpdateAppPermission();
                      }
                    }}
                    disabled={
                      appPermissionSaving ||
                      !(selectedApp.length > 0 && selectedAppLevel.length > 0)
                    }
                  >
                    {editingAppPermId
                      ? t("settings.update_permission")
                      : t("settings.add_permission")}
                  </button>
                  {editingAppPermId && (
                    <button
                      type="button"
                      className="btn cancel_btn px-3"
                      onClick={resetAppPermissionForm}
                    >
                      {t("common.cancel")}
                    </button>
                  )}
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
        <Row className="w-100 d-flex flex-row align-items-center justify-content-between bg-white border border-1 rounded mx-auto shadow-sm p-4 mt-4">
          <h4 className="form-header mb-3 p-0">{t("settings.app_permissions")}</h4>
          <div className="tableSection p-0">
            <Table
              columns={CustomColumns}
              columnData={appPermissions}
              className={"products__body-table userPermission_table"}
              tableName={"Order_list"}
              noDataContent={t("settings.app_permission_empty")}
              loading={
                Boolean(appPermissionList?.loading) || appPermissionsLoading
              }
            />
            <PopupModal
              show={showAppDeleteModal}
              onClose={() => {
                setShowAppDeleteModal(false);
                setSelectedAppRow(null);
              }}
              className={"deleteConfirmModal"}
            >
              <div className="deleteConfirmation">
                <div className="w-100 mx-auto">
                  <h5 className="text-danger text-center">
                    {t("settings.confirm_deletion")}
                  </h5>
                  <p className="text-center">
                    {t("settings.app_permission_delete_prefix")}{" "}
                    <b>{selectedAppRow?.appName}</b>
                    {t("settings.app_permission_delete_suffix")}
                  </p>
                </div>
                <div className="d-flex flex-row align-items-center justify-content-center gap-3 delete_btn_rows">
                  <button
                    className="btn btn-0 yes_btn px-4 rounded"
                    onClick={removeAppPermission}
                    disabled={appPermissionSaving}
                  >
                    {t("common.yes")}
                  </button>
                  <button
                    className="btn btn-0 no_btn px-4 rounded"
                    onClick={() => {
                      setSelectedAppRow(null);
                      setShowAppDeleteModal(false);
                    }}
                  >
                    {t("common.no")}
                  </button>
                </div>
              </div>
            </PopupModal>
          </div>
        </Row>
      </Fragment>
    );
  };

  const tabItems = [
    {
      id: "board",
      label: t("settings.board_permissions"),
      content: <BoardPermissions />,
      disabled: showTicketApiLoading,
    },
    {
      id: "knowledgeBase",
      label: t("settings.knowledge_base_permissions"),
      content: <KnowledgeBasePermissions />,
      disabled: showBoardApiLoading,
    },
    {
      id: "appPermission",
      label: t("settings.app_permissions"),
      content: <AppPermissions />,
      disabled: showBoardApiLoading || showTicketApiLoading,
    },
  ];

  const fetchUserBoardPermission = async (param) => {
    if (userBoardPermission.loading) return;
    if (isFetchingInstrumentRef.current) return; // Prevent multiple calls
    try {
      isFetchingInstrumentRef.current = true; // Block further fetches
      const response = await getUserBoardPermission({ regId: param });
      if (response.status) {
        dispatch({ type: "SET_USER_BOARD_PERMISSION", payload: response.data });
      } else {
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        showToast({
          message: error?.message || "Failed to Get Data.",
          variant: "danger",
        });
      }
    } finally {
      isFetchingInstrumentRef.current = false;
    }
  };

  useEffect(() => {
    if (getUserData[0]?.userInfo?.regId) {
      fetchUserBoardPermission(getUserData[0]?.userInfo?.regId);
      fetchUserKbPermission(getUserData[0]?.userInfo?.regId);
      fetchUserAppPermission(getUserData[0]?.userInfo?.regId);
      resetKbPermissionForm();
      resetAppPermissionForm();
    }
  }, [getUserData]);

  const editUserDetails = () => {
    setShowModal(true);
  };
  useEffect(() => {
    if (!userData?.[0]) {
      setGetUserData([]);
      return;
    }
    const fromContext = (workSpaceUserList?.userList || []).filter(
      (user) => user.userProfileId === userData[0].userProfileId,
    );
    setGetUserData(fromContext.length > 0 ? fromContext : userData);
  }, [workSpaceUserList, userData]);

  return (
    <Fragment key={userData?.userProfileId}>
      {getUserData.length > 0 && (
        <>
          <CustomBreadcrumb
            getName={getUserData[0]?.userInfo?.displayName}
            showUserListTable={showUserListTable}
            listLabel={listLabel}
          />

          <div className=" userOverViewContainer">
            <Row className="w-100 fluid mx-auto d-flex flex-row align-items-stretch">
              {/* this column for  rendering order overView Components rendering */}
              <Col className="d-flex flex-row justify-content-start align-items-center w-100 flex-wrap p-0">
                <Col lg={2} md={2} xs={2}>
                  <div className="rounded-circle avatars">
                    {getUserData[0]?.userInfo && (
                      <LogoAvatarShowLetter
                        genaralData={getUserData[0]?.userInfo || []}
                        profileName={"displayName" || ""}
                        outerClassName={"avatars__item rounded-circle"}
                        innerClassName={"avatars__img text-light rounded-circle m-0 p-0"}
                        index={"teammeber-"}
                        key={"teammeber-"}
                      />
                    )}
                  </div>
                </Col>
                <Col xl={9} lg={9} md={11} className="p-3">
                  <div className="d-flex flex-row flex-wrap w-100 justify-content-start gap-3 align-items-start my-2">
                    <div className="d-flex flex-column flex-wrap w-100 justify-content-start align-items-start my-2">
                      <p className="userName_Text text-wrap p-0 mx-2 m-0">
                        {getUserData[0]?.userInfo?.displayName}
                      </p>
                      <div className="userDesignation mx-2 mt-2">
                        {designationList?.data
                          ?.filter((team) => team.id === getUserData[0]?.team)[0]
                          ?.designationList?.filter(
                            (team) => team.id === getUserData[0]?.designation,
                          )[0]?.name || "NA"}
                      </div>
                    </div>
                  </div>
                  <Row className="m-0 p-0 w-100">
                    <Col
                      xl={10}
                      lg={10}
                      md={12}
                      className="my-3 d-flex flex-row flex-wrap justify-content-between gap-2"
                    >
                      {getUserData?.map((user, i) => {
                        return (
                          <Fragment key={i}>
                            <div className="userInfo_Text text-wrap p-0 m-0">
                              <div className="img-icon-styles p-0 m-0">
                                {" "}
                                <img src={emailIconNew} alt="" className="Email" /> Email
                                :
                              </div>{" "}
                              {user.userInfo.mail}
                            </div>
                            <div className="userInfo_Text text-wrap p-0 m-0">
                              <div className="img-icon-styles p-0 m-0">
                                {" "}
                                <img src={companyIcon} alt="" className="Team" /> Team :
                              </div>{" "}
                              {allTeamList?.data?.filter(
                                (team) => team.team_id === user?.team,
                              )[0]?.name || "NA"}
                            </div>
                            <div className="userInfo_Text text-wrap p-0 m-0">
                              <div className="img-icon-styles p-0 m-0">
                                <img src={companyIcon} alt="" className="Role" /> Role :
                              </div>{" "}
                              {roleList?.data?.find(
                                (item) => item.status_id === user?.userType,
                              )?.name || "NA"}
                            </div>
                            <div className="userInfo_Text text-wrap p-0 m-0">
                              <div className="img-icon-styles p-0 m-0">
                                {" "}
                                <img
                                  src={mapLocationIcon}
                                  alt="Country"
                                  className=""
                                />{" "}
                                Country :
                              </div>{" "}
                              {countryList?.data?.filter(
                                (country) => country.country_id === user.country,
                              )[0]?.country_name || "NA"}
                            </div>
                            {user?.shiftTime?.from && user?.shiftTime?.to && (
                              <div className="userInfo_Text text-wrap p-0 m-0">
                                <div className="img-icon-styles p-0 m-0">
                                  <img src={TimerIcon} alt="Timer" />
                                  Shift Time :
                                </div>{" "}
                                {user?.shiftTime?.from} - {user?.shiftTime?.to}
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </Col>
                  </Row>
                </Col>
                <Col lg={1} md={1} xs={1}>
                  <div className="editUserDetails">
                    <button
                      className="btn activeButton"
                      onClick={() => editUserDetails()}
                    >
                      <img src={pencilSimpleLine} alt="pencilSimpleLine" />{" "}
                      {t("order_view.edit")}
                    </button>
                  </div>{" "}
                </Col>
              </Col>
            </Row>
            <TabComponent tabItems={tabItems}></TabComponent>
          </div>
        </>
      )}
      {getUserData && (
        <CreateUser
          show={showModal}
          onClose={setShowModal}
          editUserData={getUserData}
          reloadTable={(updatedUserData) => getUserList(updatedUserData)}
        />
      )}
    </Fragment>
  );
};

export default UserView;
