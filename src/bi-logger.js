(function () {
  const { groupManager } = window.pimpMyWolt;

  async function logEvent(eventType, eventPayload) {
    const event = {
      group: await groupManager.getTeamName(),
      restaurant: getRestuarant(),
      user_id: await groupManager.getUserId(),
      event_type: eventType,
      event_payload: eventPayload,
    };
    return fetch(
      `https://amitmarx.wixsite.com/pimp-my-wolt/_functions/bi_event`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(event),
      }
    );
  }

  function getRestuarant() {
    const location = document?.location?.pathname;
    const regex = /restaurant\/(.*)\//gm;
    const restaurant = location?.matchAll(regex)?.next()?.value?.[1];
    return restaurant;
  }

  window.pimpMyWolt = {
    ...window.pimpMyWolt,
    biLogger: {
      logEvent,
    },
  };
})();
