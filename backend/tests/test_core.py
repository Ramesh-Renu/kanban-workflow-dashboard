def _create_workspace_with_board(client, headers):
    ws = client.post("/master/api/Workspace/addupdateworkspace", headers=headers,
                     json={"workspaceId": 0, "name": "IOD", "workflowType": 59})
    assert ws.status_code == 200, ws.text
    ws_id = ws.json()["data"]["workspaceId"]
    board = client.post("/master/api/BoardManagement/addupdateboard", headers=headers, json={
        "workSpaceId": ws_id, "boardId": 0, "boardName": "Design", "type": "subtask",
        "labels": [{"labelId": 0, "name": "To do", "color_Code": "#ccc", "position": 1},
                   {"labelId": 0, "name": "Done", "color_Code": "#0f0", "position": 2}],
        "deletedLabels": [],
    })
    assert board.status_code == 200, board.text
    return ws_id, board.json()["data"]["boardId"]


def test_userinfo_shape_for_super_admin(client, admin_headers):
    ws_id, board_id = _create_workspace_with_board(client, admin_headers)
    details = client.get("/master/api/Login/userinfo", headers=admin_headers).json()
    assert details["isSuperAdmin"] is True
    assert details["user_type"] == 45 and details["user_type_code"] == "ADM"
    assert details["is_active"] is True
    assert details["appPermission"] is None  # super admin: every hub app
    ws = details["workspaceDTO"][0]
    assert ws["work_space_id"] == ws_id and ws["boardList"][0]["boardID"] == board_id
    assert details["userRoleResponseDetail"][0]["boards"][0]["boardId"] == board_id


def test_regular_user_sees_only_permitted_boards(client, admin_headers, user_headers):
    ws_id, board_id = _create_workspace_with_board(client, admin_headers)
    details = client.get("/master/api/Login/userinfo", headers=user_headers).json()
    assert details["workspaceDTO"] == [] and details["appPermission"] == []

    user_id = details["regId"]
    client.post("/UserManagement/api/UserManagement/add_user_board_permission", headers=admin_headers,
                json={"userBoardPermissionId": 0, "userId": user_id, "boardId": board_id, "roleId": 2})
    client.post("/UserManagement/api/UserManagement/add_user_app_permission", headers=admin_headers,
                json={"userId": user_id, "appId": 114, "permission": 1})

    details = client.get("/master/api/Login/userinfo", headers=user_headers).json()
    assert [w["work_space_id"] for w in details["workspaceDTO"]] == [ws_id]
    assert details["userRoleResponseDetail"][0]["boards"][0]["roleName"] == "Member"
    assert details["appPermission"] == [{"appId": 114, "appCode": "TASKMANAGEMENT", "appName": "Task Management"}]


def test_non_admin_blocked_from_admin_endpoints(client, user_headers):
    assert client.post("/UserManagement/api/UserManagement/get-user-list", json={},
                       headers=user_headers).status_code == 403
    assert client.post("/master/api/Workspace/addupdateworkspace", json={"name": "x"},
                       headers=user_headers).status_code == 403


def test_add_user_then_list_and_move_types(client, admin_headers):
    jdoe = client.get("/master/api/AdManagement/ad-users", headers=admin_headers).json()
    assert [u["userName"] for u in jdoe] == ["jdoe"]
    jdoe_id = jdoe[0]["regId"]

    added = client.post("/UserManagement/api/UserManagement/add-user", headers=admin_headers, json={
        "userProfileId": 0, "userId": jdoe_id, "teamId": 0, "teamName": "Night shift", "isNewTeam": True,
        "designationId": 1, "isNewDesignation": False, "countryId": 1, "userTypeId": 46,
        "shiftTime": {"from": "09:00", "to": "18:00"},
    })
    assert added.status_code == 200 and added.json()["status"] is True

    listed = client.post("/UserManagement/api/UserManagement/get-user-list", headers=admin_headers,
                         json={"userType": 46, "pageOffset": 0, "pageSize": 10, "sortBy": "team"}).json()
    assert listed["totalCount"] == 1
    row = listed["userItems"][0]
    assert row["userInfo"]["displayName"] == "John Doe"
    assert row["team"][0]["name"] == "Night shift"
    assert row["shiftTime"] == {"from": "09:00", "to": "18:00"}

    moved = client.post("/UserManagement/api/UserManagement/update_user_type", headers=admin_headers,
                        json={"userId": jdoe_id, "userTypeId": 45, "previousUserTypeId": 46})
    assert moved.json()["status"] is True
    admins = client.post("/UserManagement/api/UserManagement/get-user-list", headers=admin_headers,
                         json={"userType": 45}).json()
    assert {r["userInfo"]["userName"] for r in admins["userItems"]} == {"admin", "jdoe"}


def test_workspace_listing_update_labels_and_soft_delete(client, admin_headers):
    ws_id, board_id = _create_workspace_with_board(client, admin_headers)
    listing = client.get("/master/api/Workspace/getworkspacewithboards", headers=admin_headers).json()
    board = listing[0]["boards"][0]
    assert listing[0]["user_Info"][0]["name"] == "Admin User"
    assert [lbl["name"] for lbl in board["labels"]] == ["To do", "Done"]

    todo, done = board["labels"]
    client.post("/master/api/BoardManagement/addupdateboard", headers=admin_headers, json={
        "workSpaceId": ws_id, "boardId": board_id, "boardName": "Design v2",
        "labels": [{**done, "position": 1}], "deletedLabels": [todo["labelId"]],
    })
    board = client.get("/master/api/Workspace/getworkspacewithboards", headers=admin_headers).json()[0]["boards"][0]
    assert board["name"] == "Design v2" and [lbl["name"] for lbl in board["labels"]] == ["Done"]

    r = client.request("DELETE", "/master/api/Workspace/deleteworkspaceboard", headers=admin_headers,
                       json={"type": "workspace", "workSpaceId": ws_id, "boardId": 0})
    assert r.status_code == 200
    assert client.get("/master/api/Workspace/getworkspacewithboards", headers=admin_headers).json() == []


def test_masters(client, user_headers):
    roles = client.get("/OrderTicketing/api/OrderTicketManagement/status-type?type=USERROLE",
                       headers=user_headers).json()
    assert [(r["status_id"], r["code"]) for r in roles] == [(45, "ADM"), (46, "USR"), (47, "INA")]
    assert client.get("/master/api/Team/getallteam", headers=user_headers).json()
    assert len(client.get("/master/api/AppMaster/apps", headers=user_headers).json()) == 7


def test_unmigrated_endpoint_returns_501_without_auth_words(client, user_headers):
    r = client.get("/dashBoard/api/DashBoard/workspacehealthsummary", headers=user_headers)
    assert r.status_code == 501
    assert not any(w in r.json()["message"].lower() for w in ("token", "auth", "expired", "unauthorized"))
