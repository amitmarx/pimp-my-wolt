(function () {
  const logoUrl = chrome.runtime.getURL(
    "assets/icons/pimp-my-wolt-icon-48.png"
  );

  const { groupManager, biLogger, wheel } = window.pimpMyWolt;
  const { MicroModal } = window;

  const isHebrewWolt = window.location.href.toLowerCase().includes("com/he/");
  
  const getCurrentLangugue = (english, hebrew) => isHebrewWolt ? hebrew : english
  
  const texts = {
    suggestedGuestsText: getCurrentLangugue("Suggested people" , "אנשים שאולי ירצו להזמין איתך"),
    readyText: getCurrentLangugue("Ready", "מוכן"),
    inviteAllInGroup: (groupName) => getCurrentLangugue(`Invite ${groupName}`, `הזמן את ${groupName}`),
    addGroup: getCurrentLangugue("Add Group" , "הוסף קבוצה"),
    wheelButtonTooltip: getCurrentLangugue("Don't know what to order yet?", "לא יודעים מה להזמין עדיין?"),
    orderSubtotalPrice: getCurrentLangugue("subtotal", "סכום ההזמנה"),
    orderDeliveryPrice: getCurrentLangugue("Delivery", "משלוח"),
    orderSmallFeePrice: getCurrentLangugue("Small order fee", "תוספת מחיר להזמנה קטנה מדי" ),
    orderTipPrice: getCurrentLangugue("tip", "טיפ לשליח"),
    orderServiceFeePrice: getCurrentLangugue("Service fee", "דמי תפעול")
  }

  let allGuests;
  function refreshAllGuests() {
    allGuests = groupManager.getAllGuests();
  }
  refreshAllGuests();
  let memberWoltName = "";
  let memberWoltId = "";

  const buttonSettings = {
    id: "invite-group-button-pimpMyWolt"
  };

  const wheelButtonSettings = {
    id: "wheel-button-pimpMyWolt",
  };

  const orderButtonHookSettings = {
    saveOrdersAttribute: "save-orders",
  };

  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", texts.suggestedGuestsText));
  const isParticipantTableExists = () =>
    Boolean(getElementWithText("li", texts.readyText));
  const isInviteGroupButtonExists = () =>
    Boolean(document.getElementById(buttonSettings.id));
  const isOrderButtonExists = () =>
    Boolean(document.querySelector('[data-test-id="BackendPricing.SendOrderButton"]'));

  const isWheelButtonExists = () =>
    Boolean(document.getElementById(wheelButtonSettings.id));
  const isInMainPage = () =>
    Boolean(window.location.href.toLowerCase().includes("discovery"));
  const isOrderButtonUpdated = () => {
    const orderButton = document.querySelector(
      '[data-test-id="BackendPricing.SendOrderButton"]'
    );
    return (
      orderButton.getAttribute(orderButtonHookSettings.saveOrdersAttribute) ===
      "true"
    );
  };

  async function publishWheelOfLuckModalOpen() {
    biLogger.logEvent("wheel_of_luck_modal_open", {});
  }
  async function publishWheelOfLuckCategoryOpen({ category }) {
    biLogger.logEvent("wheel_of_luck_category_open", { category });
  }

  function getElementsWithText(element, text, deepest = false) {
    const result = [];
    const xpath = deepest
      ? `//${element}[contains(text(), '${text}')]`
      : `//${element}[.//*[contains(text(), '${text}')]]`;
    const generator = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    let current = generator.iterateNext();
    while (current) {
      result.push(current);
      current = generator.iterateNext();
    }
    return result;
  }

  function getElementWithText(element, text, deepest = false) {
    return getElementsWithText(element, text, deepest)[0];
  }

  function getInviteAllBtn(teamName) {

    const onclick = async () => {
      const { invitedGuests, notInvitedGuests } = await inviteAllGuests();
      biLogger.logEvent("invite_all_group", {
        restaurant: getRestuarant(),
        invitedGuests,
        notInvitedGuests,
      });
    };
    return {
      text: texts.inviteAllInGroup(teamName),
      onclick,
    };
  }

  function getSetupYourTeamBtnProps() {
    const onclick = () => MicroModal.show("modal-add-group");
    return { text: texts.addGroup, onclick };
  }

  async function getBtn() {
    const btn = document.createElement("button");
    btn.setAttribute("id", buttonSettings.id);
    const isTeamSet = await groupManager.isTeamSet();
    const teamName = await groupManager.getTeamName();
    const { text, onclick } = isTeamSet
      ? getInviteAllBtn(teamName)
      : getSetupYourTeamBtnProps();
    btn.appendChild(document.createTextNode(text));
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

  async function addInviteGroupButton() {
    const btn = await getBtn();
    const suggestedGuestsElement = getElementWithText(
      "h3",
      texts.suggestedGuestsText
    );
    suggestedGuestsElement.appendChild(btn);
  }

  function getRestuarant() {
    const title = document.querySelector('meta[name="title"]')?.getAttribute("content")
    const restuarant = title.split('|')?.[1]?.trim()
    return restuarant;
  }

  function getTotalOrderPrice() {
    const subtotal = priceToNumber(
      getElementWithText('dt', texts.orderSubtotalPrice, true)?.parentNode?.querySelector('dd div')?.innerText
    );
    const delivery = priceToNumber(
      getElementWithText('dt', texts.orderDeliveryPrice, true)?.parentNode?.querySelector('dd div:last-of-type')?.innerText
    );
    const smallOrderFee = priceToNumber(
      getElementWithText('dt', texts.orderSmallFeePrice, true)?.parentNode?.querySelector('dd div')?.innerText
    );
    const tip = priceToNumber(
      getElementWithText('dt', texts.orderTipPrice, true)?.parentNode?.querySelector('dd div')?.innerText
    );
    const serviceFee = priceToNumber(
      getElementWithText('dt', texts.orderServiceFeePrice, true)?.parentNode?.querySelector('dd div')?.innerText
    );

    return subtotal + delivery + smallOrderFee + tip + serviceFee;
  }

  function addSetGroupModal() {
    if (!document.querySelector("#modal-add-group")) {
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
            <input id="pimp_my_wolt__name" class="pimp_my_wolt__input"/>
          </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal-buttons-pimpMyWolt" data-micromodal-close aria-label="Close this dialog window">Cancel</button>
          <button class="modal__btn modal-buttons-pimpMyWolt modal__btn-primary" id="set_team_name_btn">Confirm</button>
        </footer>
      </div>
    </div>
  </div>`;
      document.querySelector("body").insertAdjacentHTML("beforeend", modalHtml);
      const onclick = async () => {
        const teamName = document.getElementById("pimp_my_wolt__name").value;
        await groupManager.setTeamName(teamName);
        refreshAllGuests();
        MicroModal.close();
        document.getElementById(buttonSettings.id).remove();
      };
      document.getElementById("set_team_name_btn").onclick = onclick;
    }
  }

  function priceToNumber(price) {
    if (typeof price !== "string") return 0;
    const maybeNumber = Number(price.replace(/[^0-9.-]+/g, ""));
    return isNaN(maybeNumber) ? 0 : maybeNumber;
  }

  function getGuestsOrders() {
    const guestsLineItems = getElementsWithText("li", texts.readyText);

    return guestsLineItems
      .map((item) => {
        const spans = [...item.querySelectorAll("span")].map(
          (s) => s.innerText
        );
        const name = spans?.[0];

        const price = priceToNumber(spans?.find((s) => s.includes("₪")));

        return {
          name,
          price,
        };
      })
      .filter((guest) => guest.name && guest.price);
  }

  function updateOrderButtonToSaveGuestsOrders() {
    const sendOrderButton = document.querySelector(
      '[data-test-id="BackendPricing.SendOrderButton"]'
    );
    sendOrderButton.onclick = () => {
      const totalOrderPrice = getTotalOrderPrice();
      const guestsOrders = getGuestsOrders();
      const restaurant = getRestuarant();
      const orderTimestamp = Date.now();
      chrome.storage.local.set({
        totalOrderPrice,
        guestsOrders,
        orderTimestamp,
        restaurant,
      });
    };
    sendOrderButton.setAttribute(
      orderButtonHookSettings.saveOrdersAttribute,
      "true"
    );
  }

  function addMemberSetupModal() {
    if (!document.querySelector("#modal-member-setup")) {
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
        Cibus name may be found <a href="https://consumers.pluxee.co.il/user/friends" target="_blank">here</a>.
        </p>
          <p>
            <input id="pimp_my_wolt__cibus_name" class="pimp_my_wolt__input"/>
          </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal-buttons-pimpMyWolt" data-micromodal-close aria-label="Close this dialog window">Close</button>
          <button class="modal__btn modal-buttons-pimpMyWolt modal__btn-primary" id="pimp_my_wolt_add_new_member">Add</button>
        </footer>
      </div>
    </div>
  </div>`;
      document.querySelector("body").insertAdjacentHTML("beforeend", modalHtml);
      const onclick = async () => {
        const newMemberCibusName = document.getElementById(
          "pimp_my_wolt__cibus_name"
        ).value;
        const teamName = await groupManager.getTeamName();
        await fetch(
          "https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/" +
            teamName,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              cibusName: newMemberCibusName,
              woltName: memberWoltName,
            }),
          }
        );
        refreshAllGuests();
        MicroModal.close();
        // document.getElementById(buttonSettings.id).remove()
      };
      document.getElementById("pimp_my_wolt_add_new_member").onclick = onclick;
    }
  }

  function addMemberRemovalModal() {
    if (!document.querySelector("#modal-member-removal")) {
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
  </div>`;
      document.querySelector("body").insertAdjacentHTML("beforeend", modalHtml);
      const onclick = async () => {
        await fetch(
          "https://amitmarx.wixsite.com/pimp-my-wolt/_functions/group_member/" +
            memberWoltId,
          {
            method: "DELETE",
          }
        );
        refreshAllGuests();
        MicroModal.close();
      };
      document.getElementById("pimp_my_wolt_remove_member").onclick = onclick;
    }
  }

  function addRemoveButton(li, memberId) {
    const div = document.createElement("div");
    div.setAttribute("id", "pimpMyWolt_remove_from_group");
    div.setAttribute("class", "action-button-pimpMyWolt");
    const woltName = li?.querySelector("span")?.innerText;
    div.textContent = "-";
    div.onclick = async () => {
      const teamName = await groupManager.getTeamName();
      document.querySelector("#remove-member-name-pimpMyWolt").textContent =
        woltName;
      document.querySelector(
        "#remove-member-group-name-pimpMyWolt"
      ).textContent = teamName;
      memberWoltName = woltName;
      memberWoltId = memberId;
      MicroModal.show("modal-member-removal");
    };
    li.prepend(div);
  }

  function removeAddButton(li) {
    li.querySelector("#pimpMyWolt_add_to_group").remove();
  }

  function addAddButton(li) {
    const div = document.createElement("div");
    div.setAttribute("id", "pimpMyWolt_add_to_group");
    div.setAttribute("class", "action-button-pimpMyWolt");
    const woltName = li?.querySelector("span")?.innerText;
    div.textContent = "+";
    div.onclick = () => {
      memberWoltName = woltName;
      document.querySelector("#add-member-name-pimpMyWolt").textContent =
        woltName;
      document.querySelector("#pimp_my_wolt__cibus_name").value = "";
      MicroModal.show("modal-member-setup");
    };
    li.prepend(div);
  }

  function removeRemoveButton(li) {
    li.querySelector("#pimpMyWolt_remove_from_group").remove();
  }

  async function addActionBtnNextToMembers() {
    const guests = await allGuests;
    const itemsInList = getElementsWithText("li", texts.readyText);

    for (const itemInList of itemsInList) {
      itemInList.classList.add("participant-pimpMyWolt");
      const woltName = itemInList.querySelector("span").textContent;
      const member = guests.find((g) => g.woltName === woltName);
      const isInGroup = Boolean(member);
      const isAddButtonExists = Boolean(
        itemInList.querySelector("#pimpMyWolt_add_to_group")
      );
      const isRemoveButtonExists = Boolean(
        itemInList.querySelector("#pimpMyWolt_remove_from_group")
      );
      if (isInGroup) {
        isAddButtonExists && removeAddButton(itemInList);
        !isRemoveButtonExists && addRemoveButton(itemInList, member.id);
      } else {
        !isAddButtonExists && addAddButton(itemInList);
        isRemoveButtonExists && removeRemoveButton(itemInList);
      }
    }
  }

  function addWheelButton() {
    let src = chrome.runtime.getURL("/assets/hungry_wheel.png");
    let btnDiv = document.createElement("div");
    btnDiv.id = wheelButtonSettings.id;
    btnDiv.tabIndex = "0";
    btnDiv.style.backgroundImage = "url('" + src + "')";
    btnDiv.classList.add(wheelButtonSettings.id, "brand_item", "hover_btn");

    btnDiv.setAttribute("data-tooltip", texts.wheelButtonTooltip);

    btnDiv.onclick = () => {
      MicroModal.show("modal-random");
      publishWheelOfLuckModalOpen()
    }
    const woltMainBar = getWoltMainBar();
    woltMainBar?.insertAdjacentElement("afterbegin", btnDiv);
  }

  function getWoltMainBarForLoggedInUser() {
    const profileImage = document.querySelector(
      '[data-test-id="UserStatus.ProfileImage"]'
    );
    const profileImageButton = profileImage?.parentElement;
    const profileImageDiv = profileImageButton?.parentElement;
    return profileImageDiv?.parentElement;
  }

  function getWoltMainBarForLoggedOutUser() {
    const signupButton = document.querySelector(
      '[data-test-id="UserStatus.Signup"]'
    );
    const signupDiv = signupButton?.parentElement;
    const loginDiv = signupDiv?.parentElement;
    return loginDiv?.parentElement;
  }

  function getWoltMainBar() {
    return getWoltMainBarForLoggedInUser() || getWoltMainBarForLoggedOutUser();
  }

  function addCategoryModal() {
    if (!document.querySelector("#modal-random")) {
      const modalDiv = `<div class="modal micromodal-slide modal-pimpMyWolt" id="modal-random" aria-hidden="true">
    <div class="modal__overlay" tabindex="-1" data-micromodal-close>
    <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-random-title">
    <header class="modal__header modal-header-pimpMyWolt">
          <img src="${logoUrl}"/>
          <h2 class="modal__title" id="modal-add-group-title">
            I'm Feeling Lucky
          </h2>
        </header>
      <div id="wheelOfFortune">
      <canvas id="wheel" width="300" height="300"></canvas>
      <div id="spin-pimpMyWolt">SPIN</div>
      </div>
        <footer class="modal__footer">
          <button id="order-btn-pimpMyWolt" class="modal__btn modal-buttons-pimpMyWolt modal__btn-primary disabled-pimpMyWolt" aria-label="Close this dialog window">Ok, let's order</button>
        </footer>
      </div>
    </div>
  </div>`;

      const modalContainer = document.createElement("div");
      modalContainer.innerHTML = modalDiv;

      document.querySelector("body").appendChild(modalContainer);
      wheel.init();

      const onClick = () => {
        const text = document
          .getElementById("spin-pimpMyWolt")
          .getAttribute("data-last-label");
        const linkRef = getCurrentLangugue(
          `https://wolt.com/en/search?q=${text}`,
          `https://wolt.com/he/search?q=${text}`
        );
        publishWheelOfLuckCategoryOpen({ category: text });
        window.open(linkRef, "_blank");
        MicroModal.close();
      };

      document.getElementById("order-btn-pimpMyWolt").onclick = onClick;
    }
  }

  function addModals() {
    addSetGroupModal();
    addMemberSetupModal();
    addMemberRemovalModal();
    addCategoryModal();
  }

  setInterval(async () => {
    addModals();

    if (!isWheelButtonExists() && isInMainPage()) {
      addWheelButton();
    }

    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      addInviteGroupButton();
    }

    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }

    if (
      isParticipantTableExists() &&
      Boolean(await groupManager.getTeamName())
    ) {
      addActionBtnNextToMembers();
    }
  }, 200);
})();
