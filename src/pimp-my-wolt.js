(function () {
  const { groupManager, biLogger } = window.pimpMyWolt;
  const {MicroModal} = window
  const allGuests = groupManager.getAllGuests();

  const buttonSettings = {
    id: "invite-group-button-extension",
    text: "Invite Noname",
  };

  const orderButtonHookSettings = {
    saveOrdersAttribute: "save-orders",
  };

  const isHebrewWolt = window.location.href.toLowerCase().includes("com/he/");
  const suggestedGuestsText = isHebrewWolt
    ? "אנשים שאולי ירצו להזמין איתך"
    : "Suggested guests";
  const deliveryText = isHebrewWolt ? "משלוח" : "Delivery";

  const isInInviteGroupPage = () =>
    Boolean(getElementWithText("h3", suggestedGuestsText));
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
  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
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
      const text = isHebrewWolt ? 'הוסף קבוצה' : 'Add team'
      const onclick = () => MicroModal.show('modal-1')
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
    const modalHtml = ` <div class="modal micromodal-slide" id="modal-1" aria-hidden="true">
    <div class="modal__overlay" tabindex="-1" data-micromodal-close>
      <div class="modal__container" role="dialog" aria-modal="true" aria-labelledby="modal-1-title">
        <header class="modal__header">
          <h2 class="modal__title" id="modal-1-title">
            Set Group Name
          </h2>
          <button class="modal__close" aria-label="Close modal" data-micromodal-close></button>
        </header>
        <main class="modal__content" id="modal-1-content">
          <p>
            <input id="pimp_my_wolt__name"/>
          </p>
        </main>
        <footer class="modal__footer">
          <button class="modal__btn modal__btn-primary" id="set_team_name_btn">Continue</button>
          <button class="modal__btn" data-micromodal-close aria-label="Close this dialog window">Close</button>
        </footer>
      </div>
    </div>
  </div>`
    document.querySelector('body').insertAdjacentHTML('beforeend', modalHtml)
      const onclick = () =>{
          const teamName = document.getElementById("pimp_my_wolt__name").value;
          chrome.storage.sync.set({ teamName });
          MicroModal.close()
          document.getElementById(buttonSettings.id).remove()
      }
      document.getElementById('set_team_name_btn').onclick = onclick
  }

  setInterval(() => {
    if (!isInviteGroupButtonExists() && isInInviteGroupPage()) {
      addSetGroupModal()
      addInviteGroupButton();
    }
    if (isOrderButtonExists() && !isOrderButtonUpdated()) {
      updateOrderButtonToSaveGuestsOrders();
    }
  }, 200);
})();
