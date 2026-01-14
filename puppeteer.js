import puppeteer from "puppeteer";
import fs from "fs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);

const [productUrl, region] = args;

console.log(`URL товара: ${productUrl}`);
console.log(`Регион: ${region}`);

async function parseProduct() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    console.log("Открываю страницу товара...");
    await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 10000 });
    await delay(3000);

    console.log(`Выбираю регион: ${region}...`);
    await selectRegion(page, region);

    await delay(3000);

    console.log("Извлекаю данные о товаре...");
    const productData = await extractProductData(page);

    console.log("Делаю скриншот...");
    await page.screenshot({
      path: "screenshot.jpg",
      fullPage: true,
      type: "jpeg",
      quality: 90,
    });
    console.log("Скриншот сохранен: screenshot.jpg");

    console.log("Сохраняю данные в product.txt...");
    saveProductData(productData);

    console.log("Готово!");
    console.log("Данные товара:", productData);
  } catch (error) {
    console.error("Ошибка:", error.message);
  } finally {
    await browser.close();
  }
}

async function selectRegion(page, regionName) {
  const regionSelector = ".Region_region__6OUBn";

  try {
    await page.waitForSelector(regionSelector, { timeout: 5000 });
    console.log("Кнопка региона найдена");

    await page.click(regionSelector);
    console.log("Клик на кнопку региона выполнен");

    const regionListSelector = ".UiRegionListBase_button__smgMH";
    await page.waitForSelector(regionListSelector, { timeout: 10000 });
    console.log("Модальное окно открылось");

    await delay(500);

    const regionFound = await page.evaluate((region) => {
      const elements = document.querySelectorAll(".UiRegionListBase_button__smgMH");
      for (const el of elements) {
        if (el.textContent.includes(region)) {
          el.click();
          return true;
        }
      }
      return false;
    }, regionName);

    if (!regionFound) {
      console.log("Регион не найден в списке");
    }
  } catch {
    console.log("Селектор региона не найден");
  }
}

async function extractProductData(page) {
  return await page.evaluate(() => {
    let price = null;
    let priceOld = null;
    let rating = null;
    let reviewCount = null;

    const priceElement = document.querySelector(".Price_price__QzA8L.Price_size_XL__MHvC1");

    if (priceElement) {
      price = parseFloat(priceElement.textContent.replace(/[\s\u00A0]/g, "").replace(",", "."));
    }

    const oldPriceElement = document.querySelector(
      ".Price_price__QzA8L.Price_size_XS__ESEhJ.Price_role_old__r1uT1"
    );

    if (oldPriceElement) {
      priceOld = parseFloat(
        oldPriceElement.textContent.replace(/[\s\u00A0]/g, "").replace(",", ".")
      );
    }

    const ratingElement = document.querySelector(".ActionsRow_stars__EKt42");

    rating = parseFloat(ratingElement.textContent);

    const reviewElement = document.querySelector(".ActionsRow_reviews__AfSj_");

    reviewCount = parseInt(reviewElement.textContent.split(" ")[0]);

    return { price, priceOld, rating, reviewCount };
  });
}

function saveProductData(data) {
  const content = `price=${data.price}\npriceOld=${data.priceOld}\nrating=${data.rating}\nreviewCount=${data.reviewCount}`;

  fs.writeFileSync("product.txt", content);
  console.log("Данные сохранены в product.txt");
}

parseProduct();
