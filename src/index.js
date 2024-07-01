// const monumentMatels = require('./monumentMatels');
const bullionexchanges = require('./bullionexchanges')

const scrape = async () => {
  try {
    // const res = await monumentMatels();
    const res = await bullionexchanges();

    console.log(res);
  } catch (error) {
    console.log("error :>> ", error);
  }
};

scrape();
