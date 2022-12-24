(function () {
  const logoUrl = chrome.runtime.getURL(
    "assets/icons/pimp-my-wolt-icon-128.png"
  );
  const loaderUrl = chrome.runtime.getURL("/assets/loader.gif");
  const { groupManager, biLogger } = window.pimpMyWolt;
  const allGuests = groupManager.getAllGuests();

  const paymentButtonSettings = {
    settledAttribute: "settled",
  };

  const automaticPaymentContent = {
    divId: "postPaymentDiv-pimpMyWolt",
    autoPaymentButtonId: "autoPaymentButton-pimpMyWolt",
  };

  const message = {
    divId: "messageDiv-pimpMyWolt",
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

  async function getAutoMatch({ woltNames, cibusNames }) {
    const response = await fetch(
      `https://amitmarx.wixsite.com/pimp-my-wolt/_functions/cibus_wolt_auto_matches`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ woltNames, cibusNames }),
      }
    );
    const responseJson = await response.json();
    return responseJson;
  }

  const fetchFromStorage = (...items) =>
    new Promise((res, rej) => {
      chrome.storage.local.get(items, (result) => res(result));
    });

  async function handleMappingPayment() {
    const guests = await allGuests;
    const {
      totalOrderPrice,
      guestsOrders,
      orderTimestamp,
      restaurant,
    } = await fetchFromStorage(
      "totalOrderPrice",
      "guestsOrders",
      "orderTimestamp",
      "restaurant"
    );
    if (orderTimestamp + 30 * 1000 < Date.now() || !guestsOrders.length) {
      return;
    }
    const totalGuestsPrice = guestsOrders.reduce(
      (partialSum, guestOrder) => partialSum + guestOrder.price,
      0
    );
    // Includes delivery and tip.
    const orderAdditionalCharge = totalOrderPrice - totalGuestsPrice;
    const additionalChargePerGuest = Number(
      (orderAdditionalCharge / guestsOrders.length).toFixed(2)
    );
    const guestDebts = guestsOrders.map((guestOrder) => {
      const cibusName = guests.find(
        (guest) => guest.woltName === guestOrder.name
      )?.cibusName;
      return {
        woltName: guestOrder.name,
        cibusName,
        debt: guestOrder.price + additionalChargePerGuest,
      };
    });
    const settledGuests = await setGuestsDebts(guestDebts);
    publishSplitPaymentEvent({
      restaurant,
      settledGuests,
      guestsOrders,
      orderAdditionalCharge,
      totalOrderPrice,
    });
    return { settledGuests, guestDebts };
  }

  async function autoMatchCibusNameToBet(debts) {
    const cibusNames = getAllCibusNames();
    const woltNames = debts.map(({ woltName }) => woltName);
    const autoMapping = await getAutoMatch({ cibusNames, woltNames });
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
    publishAutoSplitPaymentEvent({ settledGuests, guestsOrders: debts });
    const autoPaymentDiv = document.querySelector(`#${automaticPaymentContent.divId}`);
    autoPaymentDiv.innerHTML =
      '<span style="font-weight: bold;">מקווים שעזרנו... &#128521;</span>';
  }

  function getAutomaticContent({ settledGuests, guestDebts }) {
    const leftToSplit = getSelectedCibusNames().length < guestDebts.length;
    const div = document.createElement("div");
    div.setAttribute("id", automaticPaymentContent.divId);

    const splitMessage =
      settledGuests.length > 0
        ? " הופה! הצלחנו לפצל " +
          settledGuests.length +
          " תשלומים עפ״י המיפוי בקבוצה. "
        : "";
    const splitSpan = document.createElement("span");
    splitSpan.appendChild(document.createTextNode(splitMessage));
    div.appendChild(splitSpan);
    div.appendChild(document.createElement("br"));

    const settledMessage =
      leftToSplit && settledGuests.length > 0
        ? "שמנו לב כי יתר המזמינים אינם ממופים - נסו את הפיצול האוטומטי שלנו. "
        : leftToSplit
        ? `לא הצלחנו לפצל תשלומים עפ״י המיפוי בקבוצה. נסו את הפיצול האוטומטי שלנו`
        : "";
    const settledSpan = document.createElement("span");
    settledSpan.appendChild(document.createTextNode(settledMessage));
    div.appendChild(settledSpan);

    if (leftToSplit) {
      const btn = document.createElement("div");
      btn.setAttribute("id", automaticPaymentContent.autoPaymentButtonId);

      const logoImage = document.createElement("img");
      logoImage.src = logoUrl;
      btn.appendChild(logoImage);

      const textDiv = document.createElement("div");
      textDiv.appendChild(document.createTextNode("פצל אוטומטית"));
      btn.appendChild(textDiv);

      const settledNames = settledGuests.map((x) => x.name);
      const debts = guestDebts.filter(
        ({ woltName }) => !settledNames.includes(woltName)
      );
      const debtsWithAutoMatch = autoMatchCibusNameToBet(debts);
      btn.onclick = () => autoSplitDebt(debtsWithAutoMatch);
      div.appendChild(btn);
    }
    return div;
  }

  function setContent(content) {
    const contentDiv = document.querySelector(`#${message.divId}`);
    if (!contentDiv) {
      const splitPanel = document.querySelector("#pnlSplitPay");
      const div = document.createElement("div");
      div.setAttribute("id", message.divId);
      splitPanel.prepend(div);
      return setContent(content);
    }
    contentDiv.innerHTML = "";
    contentDiv.prepend(content);
  }

  function setLoader() {
    const loaderImage = document.createElement("img");
    loaderImage.src = loaderUrl;
    setContent(loaderImage);
  }

  function handleAutomaticPayment({ settledGuests, guestDebts }) {
    const content = getAutomaticContent({ settledGuests, guestDebts });
    setContent(content);
  }

  function getSelectedCibusNames() {
    return new Array(...document.querySelectorAll("#splitList label"))
      .map((x) => x?.innerText)
      .filter((x) => x && !x.includes("הוספת חברים"));
  }

  function getNotSelectedCibusNames() {
    return new Array(...document.querySelectorAll("label>input"))
      .map((x) => x?.parentNode)
      .map((x) => x?.innerText);
  }

  function getAllCibusNames() {
    return [...getNotSelectedCibusNames(), ...getSelectedCibusNames()];
  }

  async function publishSplitPaymentEvent({
    restaurant,
    settledGuests,
    guestsOrders,
    orderAdditionalCharge,
    totalOrderPrice,
  }) {
    const allCibusUsersAvailable = getAllCibusNames();
    const currentCibusUser = document.querySelector("#lblMyName").innerText;
    const currentUser =
      (await allGuests).find((guest) => guest.cibusName === currentCibusUser)
        ?.woltName || currentCibusUser;
    biLogger.logEvent("split_payment", {
      restaurant,
      userName: currentUser,
      settledGuests,
      guestsOrders,
      orderAdditionalCharge,
      totalOrderPrice,
      allCibusUsersAvailable,
    });
  }

  async function publishAutoSplitPaymentEvent({ settledGuests, guestsOrders }) {
    const allCibusUsersAvailable = getAllCibusNames();
    const currentCibusUser = document.querySelector("#lblMyName").innerText;
    const currentUser =
      (await allGuests).find((guest) => guest.cibusName === currentCibusUser)
        ?.woltName || currentCibusUser;
    biLogger.logEvent("auto_split_payment", {
      userName: currentUser,
      settledGuests,
      guestsOrders,
      allCibusUsersAvailable,
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

  setInterval(async () => {
    if (isPaymentButtonExists() && !isPaymentSettled()) {
      setLoader()
      setPaymentSettled();
      openSplitPaymentTable();
      const { settledGuests, guestDebts } = await handleMappingPayment();
      handleAutomaticPayment({ settledGuests, guestDebts });
    }
  }, 100);
})();
