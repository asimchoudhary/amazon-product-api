from scrapy import Spider

class BooksToScrapeComSpider(Spider):
    name = "books_toscrape_com"
    start_urls = [
        "https://flipkart.com"
    ]

    def parse(self, response):
        yield {
            "url": response.url,
            "html": response.text,
        }
    