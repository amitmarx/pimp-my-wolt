# Pimp my Wolt

# Install

1. Download `pimp-my-wolt` [extension code](https://github.com/amitmarx/pimp-my-wolt/archive/master.zip) and extract the zip file.
2. Go to Chrome extension settings: (browse to: chrome://extensions/).
3. Switch `Developer Mode` on and click on `Load unpacked`.
4. Select the extracted folder from step 1.
5. You should now see `Pimp my Wolt` on your extensions, click on `Details` and then click `Extension options`.
6. Define your group's name.
7. Add members to [your group](#manage-group-members).

# Manage group members

Group members are managed in a crud endpoint.
In the following sections I'll use bash to interact with this endpoint, but you may chose your favourite alternative. 

## Add new group member

```bash
curl -X POST \
  https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/{GROUP_NAME} \
  -H 'content-type: application/json' \
  -d '{
        "cibusName": "{CIBUS_NAME}",
        "woltName": "{WOLT_NAME}"
}'
```

- WOLT_NAME may be found here: [https://wolt.com/en/me](https://wolt.com/en/me)
- CIBUS_NAME may be found here: [https://www.mysodexo.co.il/new_my/new_my_details.aspx](https://www.mysodexo.co.il/new_my/new_my_details.aspx)
- GROUP_NAME is created on the fly, first group member will initiate the group.

## Delete group member

```bash
curl -X DELETE \
  https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/{MEMBER_ID}
```

- MEMBER_ID may be found from the list group members endpoint

## List group members

```bash
curl https://amitmarx.wixsite.com/pimp-my-wolt/_functions/list_group_members/{GROUP_NAME}
```

- GROUP_NAME is your team's chosen name, just pick one 😎