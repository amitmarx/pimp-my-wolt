(function () {
  const logoUrl = chrome.runtime.getURL(
      "assets/icons/pimp-my-wolt-icon-48.png"
  );
  const { groupManager, biLogger } = window.pimpMyWolt;
  const allGuests = groupManager.getAllGuests();

  const paymentButtonSettings = {
    settledAttribute: "settled",
  };
  
  const postPayment = {
    divId: "postPaymentDiv-pimpMyWolt",
    autoPaymentButtonId: "autoPaymentButton-pimpMyWolt"
  };

  const getPaymentButton = () => document.getElementById("pnlBtnPay");
  const isPaymentButtonExists = () => Boolean(getPaymentButton());
  const isPaymentSettled = () => {
    const paymentButton = getPaymentButton();
    const attribute = paymentButton?.getAttribute(
      paymentButtonSettings.settledAttribute
    );
    return attribute === "true";
  };

  const setPaymentSettled = () => {
    const paymentButton = getPaymentButton();
    paymentButton?.setAttribute(paymentButtonSettings.settledAttribute, "true");
  };

  function getElementWithText(element, text) {
    const xpath = `//${element}[.//*[contains(text(), "${text}")]]`;
    return document
      .evaluate(xpath, document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
  }

  async function getAutoMatch({woltNames, cibusNames}) {
    const response = await fetch(
      `https://amitmarx.wixsite.com/pimp-my-wolt/_functions/cibus_wolt_auto_matches`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({woltNames, cibusNames})
      }
    );
    const responseJson = await response.json();
    return responseJson;
  }

  async function handleCibusPayment() {
    const guests = await allGuests;
    chrome.storage.local.get(
      ["deliveryPrice", "guestsOrders", "orderTimestamp", "restaurant"],
      async ({ deliveryPrice, guestsOrders, orderTimestamp, restaurant }) => {
        if (orderTimestamp + 30 * 1000 < Date.now()) {
          return;
        }
        const guestDeliveryShare = Number(
          (deliveryPrice / guestsOrders.length).toFixed(2)
        );
        const guestDebts = guestsOrders.map((guestOrder) => {
          const cibusName = guests.find(
            (guest) => guest.woltName === guestOrder.name
          )?.cibusName;
          return {
            woltName: guestOrder.name,
            cibusName,
            debt: guestOrder.price + guestDeliveryShare,
          };
        });
        const settledGuests = await setGuestsDebts(guestDebts);
        handlePostPayment({settledGuests, guestDebts})
        publishSplitPaymentEvent({
          restaurant,
          settledGuests,
          guestsOrders,
          deliveryPrice,
        });
      }
    );
  }

  async function autoMatchCibusNameToBet(debts){
    const cibusNames = getAllCibusNames()
    const woltNames = debts.map(({woltName})=> woltName)
    const autoMapping = await getAutoMatch({cibusNames, woltNames})
    const cibusToWolt = autoMapping.reduce((o, item) => {
      o[item.woltName] = item.cibusName;
      return o;
    }, {});
    return debts.map((d) => {
      return {
        ...d,
        cibusName: cibusToWolt[d.woltName],
      };
    });
  }

  async function autoSplitDebt(asyncDebts) {
    const debts = await asyncDebts;
    const settledGuests = await setGuestsDebts(debts);
    publishAutoSplitPaymentEvent({settledGuests, guestsOrders: debts})
    const postPaymentDiv = document.querySelector(`#${postPayment.divId}`)
    postPaymentDiv.innerHTML = "<span>מקווים שעזרנו... &#128521;</span>"
  }
  
  function getPostPaymentContent({ settledGuests, guestDebts }) {
    const leftToSplit = settledGuests.length < guestDebts.length - 1;
    const div = document.createElement("div");
    div.setAttribute("id", postPayment.divId);

    const splitMessage =
      settledGuests.length > 0
        ? " הופה! הצלחנו לפצל " + settledGuests.length + "תשלומים עפ״י המיפוי בקבוצה שלך."
        : `לא הצלחנו לפצל תשלומים עפ״י המיפוי בקבוצה.`;
    const splitSpan = document.createElement("span")
    splitSpan.appendChild(document.createTextNode(splitMessage));
    div.appendChild(splitSpan);
    div.appendChild(document.createElement("br"))

    const settledMessage = leftToSplit
      ? "אל דאגה, אפשר לנסות את מנגנון הפיצול האוטומטי שלנו"
      : "";
    const settledSpan = document.createElement("span");
    settledSpan.appendChild(document.createTextNode(settledMessage))
    div.appendChild(settledSpan);

    if (leftToSplit) {
      const btn = document.createElement("div");
      btn.setAttribute("id", postPayment.autoPaymentButtonId);
      btn.appendChild(document.createTextNode("פצל אוטומטית"));

      const logoImage = document.createElement('img');
      logoImage.src = logoUrl;
      btn.appendChild(logoImage)

      const settledNames = settledGuests.map(x=> x.name)
      const debts = guestDebts.filter(({woltName}) => !settledNames.includes(woltName))
      const debtsWithAutoMatch = autoMatchCibusNameToBet(debts)
      btn.onclick = () => autoSplitDebt(debtsWithAutoMatch);
      div.appendChild(btn);
    }
    return div;
  }

  function handlePostPayment({ settledGuests, guestDebts }) {
    const content = getPostPaymentContent({ settledGuests, guestDebts });
    const splitPanel = document.querySelector("#pnlSplitPay");
    splitPanel.prepend(content);
  }
  
  function getAllCibusNames() {
    const notSelectedUsers = new Array(
      ...document.querySelectorAll("label>input")
    )
      .map((x) => x?.parentNode)
      .map((x) => x?.innerText);
    const selectedUsers = new Array(
      ...document.querySelectorAll("#splitList label")
    )
      .map((x) => x?.innerText)
      .filter((x) => x && !x.includes("הוספת חברים"));
    return [...notSelectedUsers, ...selectedUsers];
  }

  async function publishSplitPaymentEvent({
    restaurant,
    settledGuests,
    guestsOrders,
    deliveryPrice,
  }) {
    const allCibusUsersAvailable = getAllCibusNames()
    const currentCibusUser = document.querySelector("#lblMyName").innerText;
    const currentUser =
      (await allGuests).find((guest) => guest.cibusName === currentCibusUser)
        ?.woltName || currentCibusUser;
    biLogger.logEvent("split_payment", {
      restaurant,
      userName: currentUser,
      settledGuests,
      guestsOrders,
      deliveryPrice,
      allCibusUsersAvailable
    });
  }

  async function publishAutoSplitPaymentEvent({
    settledGuests,
    guestsOrders,
  }) {
    const allCibusUsersAvailable = getAllCibusNames()
    const currentCibusUser = document.querySelector("#lblMyName").innerText;
    const currentUser =
      (await allGuests).find((guest) => guest.cibusName === currentCibusUser)
        ?.woltName || currentCibusUser;
    biLogger.logEvent("auto_split_payment", {
      userName: currentUser,
      settledGuests,
      guestsOrders,
      allCibusUsersAvailable
    });
  }

  async function setGuestsDebts(guestDebts) {
    const settledGuests = [];
    for (guestDebt of guestDebts) {
      getElementWithText("label", guestDebt.cibusName)?.click();
    }

    for (guestDebt of guestDebts) {
      const guestInput = await waitForValue(() =>
        getElementWithText("label", guestDebt.cibusName)?.querySelector("input")
      );
      if (guestInput) {
        guestInput.value = guestDebt.debt;
        guestInput.dispatchEvent(
          new UIEvent("change", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
        );
        settledGuests.push({ name: guestDebt.woltName, price: guestDebt.debt });
      }
    }
    return settledGuests;
  }

  function waitForValue(f, attempts = 100) {
    return new Promise((res, rej) => {
      function tryGetValue(attempts) {
        const maybe = f();
        if (attempts === 0 || maybe) res(maybe);
        else {
          setTimeout(() => tryGetValue(attempts - 1), 10);
        }
      }
      tryGetValue(attempts);
    });
  }

  function openSplitPaymentTable() {
    document.querySelector('label[for="cbSplit"]').click();
  }

  setInterval(() => {
    if (isPaymentButtonExists() && !isPaymentSettled()) {
      setPaymentSettled();
      openSplitPaymentTable();
      handleCibusPayment();
    }
  }, 100);
})();
