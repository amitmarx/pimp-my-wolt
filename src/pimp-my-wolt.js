(function () {
  const logoUrl = chrome.runtime.getURL("assets/icons/pimp-my-wolt-icon-48.png");

  const { groupManager, biLogger } = window.pimpMyWolt;
  const {MicroModal} = window

  let allGuests;
  function refreshAllGuests(){
    allGuests = groupManager.getAllGuests();
  }
  refreshAllGuests()
  let memberWoltName = ''
  let memberWoltId = ''

  const buttonSettings = {
    id: "invite-group-button-pimpMyWolt",
    text: "Invite Noname",
  };

  const orderButtonHookSettings = {
    saveOrdersAttribute: "save-orders",
  };

  const isHebrewWolt = window.location.href.toLowerCase().includes("com/he/");
  const suggestedGuestsText = isHebrewWolt
    ? "אנשים שאולי ירצו להזמין איתך"
    : "Suggested guests";
  const readyText = isHebrewWolt ? 'מוכן' : 'Ready'
  const deliveryText = isHebrewWolt ? "משלוח" : "Delivery";

  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", suggestedGuestsText));
  const isParticipantTableExists = () =>
      Boolean(getElementWithText("li", readyText));
  const isInviteGroupButtonExists = () =>
    Boolean(document.getElementById(buttonSettings.id));
  const isOrderButtonExists = () =>
    Boolean(document.querySelector('[data-test-id="SendOrderButton"]'));

  const isOrderButtonUpdated = () => {
    const orderButton = document.querySelector(
      '[data-test-id="SendOrderButton"]'
    );
    return (
      orderButton.getAttribute(orderButtonHookSettings.saveOrdersAttribute) ===
      "true"
    );
  };
  function getElementsWithText(element, text) {
    const result = []
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    const generator = document
        .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
    let current = generator.iterateNext()
    while (current){
      result.push(current)
      current = generator.iterateNext()
    }
    return result
  }

  function getElementWithText(element, text) {
    return getElementsWithText(element, text)[0]
  }

  function getInviteAllBtn(teamName){
    const text = isHebrewWolt
      ? `הזמן את ${teamName}`
      : `Invite ${teamName}`;

    const onclick = async () => {
      const { invitedGuests, notInvitedGuests } = await inviteAllGuests();
      biLogger.logEvent("invite_all_group", {
        restaurant: getRestuarant(),
        invitedGuests,
        notInvitedGuests,
      });
    };
      return {
          text,
          onclick
      }
  }

  function getSetupYourTeamBtnProps(){
      const text = isHebrewWolt ? 'הוסף קבוצה' : 'Add Group'
      const onclick = () => MicroModal.show('modal-add-group')
      return {text, onclick}
  }

  async function getBtn() {
    const btn = document.createElement("button");
    btn.setAttribute("id", buttonSettings.id);
    const teamName = await groupManager.getTeamName();
    const {text, onclick} = teamName ? getInviteAllBtn(teamName) : getSetupYourTeamBtnProps()
    btn.appendChild(document.createTextNode(text))
    btn.onclick = onclick;
    return btn;
  }

  async function inviteAllGuests() {
    const guests = await allGuests;
    const invitedGuests = [];
    const notInvitedGuests = [];
    for (guest of guests) {
      const guestName = guest.woltName;
      const inviteButton = getElementWithText("li", guestName)?.querySelector(
        "button"
      );
      inviteButton?.click();
      (inviteButton ? invitedGuests : notInvitedGuests).push(guestName);
    }
    return {
      invitedGuests,
      notInvitedGuests,
    };
  }

  function getRestuarant() {
    const location = document?.location?.pathname;
    const regex = /restaurant\/(.*)\//gm;
    const restaurant = location?.matchAll(regex)?.next()?.value?.[1];
    return restaurant;
  }

  function getDeliveryPrice() {
    const amountWithCurrency = getElementWithText(
      "dl",
      deliveryText
    )?.querySelector("dd")?.innerText;
    return priceToNumber(amountWithCurrency ?? "");
  }

  function priceToNumber(price) {
    if (typeof price !== "string") return 0;
    const maybeNumber = Number(price.replace(/[^0-9.-]+/g, ""));
    return isNaN(maybeNumber) ? 0 : maybeNumber;
  }

  function getGuestsOrders() {
    const orderTable = document.querySelector(
      "[class^=Tabs__root] [class^=Tabs__content]"
    );
    const guestsLineItems = Array.from(
      orderTable?.querySelectorAll("li") || []
    );

    return guestsLineItems
      .map((item) => {
        const name = item.querySelector('[class*="GuestItem__listName"] span')
          ?.innerText;
        const price = priceToNumber(
          item.querySelector('[class*="GuestItem__price"]')?.innerText
        );

        return {
          name,
          price,
        };
      })
      .filter((guest) => guest.name && guest.price);
  }

  function updateOrderButtonToSaveGuestsOrders() {
    const sendOrderButton = document.querySelector(
      '[data-test-id="SendOrderButton"]'
    );
    sendOrderButton.onclick = () => {
      const guestsOrders = getGuestsOrders();
      const deliveryPrice = getDeliveryPrice();
      const restaurant = getRestuarant();
      const orderTimestamp = Date.now();
      chrome.storage.local.set({ guestsOrders, deliveryPrice, orderTimestamp, restaurant });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  async function addInviteGroupButton() {
    const btn = await getBtn();
    const suggestedGuestsElement = getElementWithText(
      "h3",
      suggestedGuestsText
    );
    suggestedGuestsElement.appendChild(btn);
  }

  function addSetGroupModal() {
    if(!document.querySelector('#modal-add-group')) {
      const modalHtml = ` <div class="modal micromodal-slide modal-pimpMyWolt" id="modal-add-group" aria-hidden="true">
    <div class="modal__overlay" tabindex="-1" data-micromodal-close>
      <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-add-group-title">
        <header class="modal__header modal-header-pimpMyWolt">
          <img src="${logoUrl}"/>
          <h2 class="modal__title" id="modal-add-group-title">
            Set Group Name
          </h2>
        </header>
        <main id="modal-add-group-content">
          <p>
          Please set your group name.  <br/>
          <ul>
            <li class="little-letters-pimpMyWolt">You can always change your group on<br/>
                <b>Pimp my Wolt</b> extension options.</li>  
            <li class="little-letters-pimpMyWolt">Adding members to your group is <br/>
                available on order checkout.</li>
           </ul>
          </p>
          <p>
            <input id="pimp_my_wolt__name"/>
          </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal-buttons-pimpMyWolt" data-micromodal-close aria-label="Close this dialog window">Cancel</button>
          <button class="modal__btn modal-buttons-pimpMyWolt modal__btn-primary" id="set_team_name_btn">Confirm</button>
        </footer>
      </div>
    </div>
  </div>`
      document.querySelector('body').insertAdjacentHTML('beforeend', modalHtml)
      const onclick = async () => {
        const teamName = document.getElementById("pimp_my_wolt__name").value;
        await groupManager.setTeamName(teamName);
        refreshAllGuests()
        MicroModal.close()
        document.getElementById(buttonSettings.id).remove()
      }
      document.getElementById('set_team_name_btn').onclick = onclick
    }
  }

  function addMemberSetupModal() {
    if(!document.querySelector('#modal-member-setup')) {
      const modalHtml = ` <div class="modal micromodal-slide modal-pimpMyWolt" id="modal-member-setup" aria-hidden="true">
    <div class="modal__overlay" tabindex="-1" data-micromodal-close>
      <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-member-setup-title">
        <header class="modal__header modal-header-pimpMyWolt">
        <img src="${logoUrl}"/>
          <h2 class="modal__title" id="modal-member-setup-title">
            Set Group Member Name
          </h2>
        </header>
        <main id="modal-member-setup-content">
        <p>
        Please type <b><span id="add-member-name-pimpMyWolt"/></b> name on cibus.<br/>
        Cibus name may be found <a href="https://www.mysodexo.co.il/new_my/new_my_friends.aspx" target="_blank">here</a>.
        </p>
          <p>
            <input id="pimp_my_wolt__cibus_name"/>
          </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal-buttons-pimpMyWolt" data-micromodal-close aria-label="Close this dialog window">Close</button>
          <button class="modal__btn modal-buttons-pimpMyWolt modal__btn-primary" id="pimp_my_wolt_add_new_member">Add</button>
        </footer>
      </div>
    </div>
  </div>`
      document.querySelector('body').insertAdjacentHTML('beforeend', modalHtml)
      const onclick = async () => {
        const newMemberCibusName = document.getElementById("pimp_my_wolt__cibus_name").value;
        const teamName = await groupManager.getTeamName();
        await fetch('https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/'+teamName, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({cibusName: newMemberCibusName, woltName: memberWoltName})
        });
        refreshAllGuests()
        MicroModal.close()
        // document.getElementById(buttonSettings.id).remove()
      }
      document.getElementById('pimp_my_wolt_add_new_member').onclick = onclick
    }
  }

  function addMemberRemovalModal() {
    if(!document.querySelector('#modal-member-removal')) {
      const modalHtml = ` <div class="modal micromodal-slide modal-pimpMyWolt" id="modal-member-removal" aria-hidden="true">
    <div class="modal__overlay" tabindex="-1" data-micromodal-close>
      <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-member-removal-title">
        <header class="modal__header modal-header-pimpMyWolt">
        <img src="${logoUrl}"/>
          <h2 class="modal__title" id="modal-member-removal-title">
            Remove Group Member
          </h2>
        </header>
        <main id="modal-member-setup-content">
        <p>
        Are you sure you want to remove <br/>
            <b><span id="remove-member-name-pimpMyWolt"/></b> from <b><span id="remove-member-group-name-pimpMyWolt"/></b> group?
        </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal-buttons-pimpMyWolt" data-micromodal-close aria-label="Close this dialog window">Close</button>
          <button class="modal__btn modal__btn-primary modal-buttons-pimpMyWolt " id="pimp_my_wolt_remove_member">Remove</button>
        </footer>
      </div>
    </div>
  </div>`
      document.querySelector('body').insertAdjacentHTML('beforeend', modalHtml)
      const onclick = async () => {
        await fetch('https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/'+memberWoltId, {
          method: 'DELETE'
        });
        refreshAllGuests()
        MicroModal.close()
      }
      document.getElementById('pimp_my_wolt_remove_member').onclick = onclick
    }
  }

  function addRemoveButton(li, memberId) {
    const div = document.createElement("div")
    div.setAttribute('id', 'pimpMyWolt_remove_from_group')
    div.setAttribute('class', 'action-button-pimpMyWolt')
    const woltName= li?.querySelector('span')?.innerText
    div.textContent ="-";
    div.onclick = async () => {
      const teamName = await groupManager.getTeamName();
      document.querySelector('#remove-member-name-pimpMyWolt').textContent = woltName
      document.querySelector('#remove-member-group-name-pimpMyWolt').textContent = teamName
      memberWoltName = woltName
      memberWoltId = memberId
      MicroModal.show('modal-member-removal')
    }
    li.prepend(div)
  }

  function removeAddButton(li) {
    li.querySelector('#pimpMyWolt_add_to_group').remove()
  }

  function addAddButton(li) {
    const div = document.createElement("div")
    div.setAttribute('id', 'pimpMyWolt_add_to_group')
    div.setAttribute('class', 'action-button-pimpMyWolt')
    const woltName= li?.querySelector('span')?.innerText
    div.textContent ="+";
    div.onclick = ()=>{
      memberWoltName = woltName
      document.querySelector('#add-member-name-pimpMyWolt').textContent = woltName
      MicroModal.show('modal-member-setup')
    }
    li.prepend(div)
  }


  function removeRemoveButton(li) {
    li.querySelector('#pimpMyWolt_remove_from_group').remove()
  }

  async function addActionBtnNextToMembers() {
    const guests = await allGuests;
    const itemsInList = getElementsWithText('li', readyText)

    for (const itemInList of itemsInList){
      itemInList.classList.add("participant-pimpMyWolt")
      const woltName = itemInList.querySelector('span').textContent
      const member = guests.find(g=> g.woltName === woltName)
      const isInGroup = Boolean(member)
      const isAddButtonExists = Boolean(itemInList.querySelector('#pimpMyWolt_add_to_group'))
      const isRemoveButtonExists = Boolean(itemInList.querySelector('#pimpMyWolt_remove_from_group'))
      if(isInGroup){
        isAddButtonExists && removeAddButton(itemInList)
        !isRemoveButtonExists && addRemoveButton(itemInList, member.id)
      } else {
        !isAddButtonExists && addAddButton(itemInList)
        isRemoveButtonExists && removeRemoveButton(itemInList)
      }
    }

  }

  function addModals() {
    addSetGroupModal()
    addMemberSetupModal()
    addMemberRemovalModal()
  }

  setInterval(async () => {
    addModals()

    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      addInviteGroupButton();
    }

    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }

    if(isParticipantTableExists() && Boolean(await groupManager.getTeamName())) {
      addActionBtnNextToMembers()
    }
  }, 200);
})();
