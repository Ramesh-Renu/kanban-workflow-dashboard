# status_master ids for type USERROLE. The frontend hardcodes these values
# (e.g. pages/Settings/Users/InActiveUser uses 45/46/47), so they must stay fixed.
USER_TYPE_ADMIN = 45
USER_TYPE_USER = 46
USER_TYPE_INACTIVE = 47

USER_TYPE_CODES = {
    USER_TYPE_ADMIN: "ADM",
    USER_TYPE_USER: "USR",
    USER_TYPE_INACTIVE: "INA",
}
