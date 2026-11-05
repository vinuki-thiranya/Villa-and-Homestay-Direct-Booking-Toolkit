# StayDirect LK — SEO launch checklist

What to do in Google, Bing and the main listing sites when we launch `staydirect.lk` and when each owner's guest site goes live. Links go to the official help pages. Check them again if a screen looks different, because Google and Tripadvisor change their tools often.

---

## 1. For StayDirect (once)

### Google Search Console
- [ ] Add `staydirect.lk` as a **Domain property**: enter `staydirect.lk` only, with no `https://` and no `www` ([add a property](https://support.google.com/webmasters/answer/34592)). A Domain property covers every subdomain and both http and https. That means it also covers `app.`, `admin.` and every `{slug}.staydirect.lk` guest site.
- [ ] Verify it with a **DNS TXT record** at the `staydirect.lk` DNS host. Use `@` or a blank host, paste the value that Search Console gives you, then select Verify. It can take two or three days before the record is served ([verify ownership](https://support.google.com/webmasters/answer/9008080)).
- [ ] Never delete the TXT record. Search Console checks it from time to time, and access expires after a grace period if the record has gone.
- [ ] Add the rest of the team as users. Do not share the Google login.
- [ ] Submit `https://staydirect.lk/sitemap.xml` in the **Sitemaps** report. Only property owners can submit. Check that the status says **Success**, and open the row if it doesn't ([Sitemaps report](https://support.google.com/webmasters/answer/7451001)).
- [ ] Use **URL Inspection → Test live URL** on `https://staydirect.lk/` and `https://staydirect.lk/si`. Then select **Request indexing** for both ([URL Inspection](https://support.google.com/webmasters/answer/9012289)).
- [ ] About a week after launch, open the **Page indexing** report ([Page indexing report](https://support.google.com/webmasters/answer/7440203)):
  - [ ] The home page and the main marketing pages in English and Sinhala are indexed.
  - [ ] `app.` and `admin.` URLs show as **Blocked by robots.txt** or not indexed. That is expected.
  - [ ] Read each reason under "Why pages aren't indexed". Fix the ones caused by our site, then select **Validate fix**. Validation can take up to about two weeks.
- [ ] Check hreflang by hand. Search Console no longer has an hreflang report, because the International Targeting report was retired ([deprecation notice](https://support.google.com/webmasters/answer/12474899)).
  - [ ] Inspect one English URL and its `/si` version. For each one, the **Google-selected canonical** should be the page itself, not the other language.
  - [ ] In the sitemap, each language version must list itself and every other version. If the return links are missing, Google ignores the tags ([localised versions](https://developers.google.com/search/docs/specialty/international/localized-versions)).

### Bing Webmaster Tools
- [ ] Sign in to Bing Webmaster Tools and go to **My Sites → Import**. Allow access to Search Console and pick `staydirect.lk`. The import brings the site, our role and its sitemaps, and the site is verified automatically ([Bing: import from Search Console](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)).
- [ ] Bing keeps checking ownership through the Search Console link. If that access is ever removed, verify again with a meta tag or DNS record.
- [ ] Open **Sitemaps** and confirm that `https://staydirect.lk/sitemap.xml` is listed and has been read. Bing also finds it through the `Sitemap:` line in robots.txt ([Bing Sitemaps help](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)).

### Google Business Profile for StayDirect itself
- [ ] **Only create one if we have a staffed office where we meet customers in person during the hours we publish.** Google requires in-person contact with customers during stated hours. It lists "online-only businesses" as ineligible, along with virtual offices and mailbox addresses ([eligibility guidelines](https://support.google.com/business/answer/13763036), [guidelines for representing your business](https://support.google.com/business/answer/3038177)).
- [ ] If we only work online or from home, **do not create a profile**. Brand searches are then handled by the website, Search Console and social profiles.
- [ ] If we do qualify: use our real name ("StayDirect LK") with no keywords, the real street address and a phone number under our direct control.

### Monitoring (monthly)
- [ ] **Core Web Vitals** report, mobile and desktop. Targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. The data comes from real Chrome users, so small sites may show "not enough data". In that case, test key pages in PageSpeed Insights. After a fix, select **Start tracking**, which begins a 28-day check ([Core Web Vitals report](https://support.google.com/webmasters/answer/9205520)).
- [ ] Watch the Page indexing report for a drop in indexed pages, and the Sitemaps report for errors.
- [ ] Spot-check a few owner subdomains in the Domain property. Report problems to the owner or fix the platform.

---

## 2. For each owner (at launch)

Do these in the owner app under **Setup → Google & local guide** (`/owner/setup/local`). That page shows the site URL, the sitemap URL, the booking link for Google and the launch checklist.

### Domain (optional)
- [ ] If the owner wants their own domain, StayDirect support connects it by pointing its DNS at Vercel. The `{slug}.staydirect.lk` address keeps working. Canonical tags then point to the custom domain.
- [ ] Do this **before** Search Console, so that the owner verifies the domain Google will treat as the main one.

### Google Search Console
Choose one of the two options:
- [ ] **Option A, the easiest (any site):** add a **URL-prefix property**.
  - [ ] Enter the exact site URL from the Setup tab, for example `https://{slug}.staydirect.lk/` or `https://www.owner-domain.com/`.
  - [ ] Choose **HTML tag**, copy the meta tag, and paste it into the Search Console verification field in our tab. The field accepts the whole tag or just the `content` value.
  - [ ] Save, then select **Verify** in Search Console. Leave the code in our tab. If it is removed, the owner loses access after a grace period ([verify ownership](https://support.google.com/webmasters/answer/9008080)).
- [ ] **Option B (custom domain only):** add a **Domain property** and verify it with a DNS TXT record at the owner's registrar. This covers `www` and non-`www`, and http and https ([add a property](https://support.google.com/webmasters/answer/34592)).
- [ ] Owners on a `staydirect.lk` subdomain can't use Option B, because they don't control our DNS.
- [ ] Submit the sitemap URL shown in the Setup tab (`{site}/sitemap.xml`) in **Sitemaps**. It must be on the same host as the property ([Sitemaps report](https://support.google.com/webmasters/answer/7451001)).
- [ ] Inspect the home page and select **Request indexing**. Repeat for the language home pages the owner cares about (`/de`, `/fr`, `/hi`, `/si`).
- [ ] After about a week, check **Page indexing**. Booking, guide and review links show as blocked by robots.txt on purpose.
- [ ] Optional: import the property into Bing Webmaster Tools in the same way.

### Google Business Profile
- [ ] **Check eligibility first.** A property qualifies when the owner, a host or staff meet guests in person at the property. Examples are a guesthouse, homestay or B&B, or a villa with an on-site caretaker or check-in.
  - [ ] Google lists "rental or for-sale properties such as vacation homes" as ineligible ([eligibility](https://support.google.com/business/answer/13763036)).
  - [ ] Google's hotel help also says "individual homeowners aren't currently eligible for a Google Business Profile for their physical home" ([vacation rentals guide](https://support.google.com/hotelprices/answer/12564561)).
  - [ ] A self-catering house let by a private owner with nobody on site should skip Google Business Profile. Rely on the website instead.
- [ ] **Verify Search Console first.** Google says Business Profile verification "can be instant" if the website is already verified in Search Console ([verify your business](https://support.google.com/business/answer/7107242)).
- [ ] **Claim or create the profile.**
  - [ ] Search Google Maps for the property name and town. If it's already listed, choose **Claim this business → Manage now**.
  - [ ] Otherwise, add it at `business.google.com/add` ([add or claim](https://support.google.com/business/answer/2911778)).
  - [ ] Google chooses the verification method: video, phone/SMS, email, live video call or postcard. Approval can take up to 5 business days.
- [ ] **Name, address and phone (NAP).** They must match the guest site's contact page exactly.
  - [ ] Use the real-world name with no keywords or taglines, the precise address and a phone number the owner controls ([guidelines](https://support.google.com/business/answer/3038177)).
  - [ ] If any of them changes later, update the site and the profile on the same day.
- [ ] **Website field.** Paste the ready link from the Setup tab: `{site}/?utm_source=google&utm_medium=organic&utm_campaign=gbp` ([edit your profile](https://support.google.com/business/answer/3039617)).
- [ ] **Booking links: know the limits for lodging.**
  - [ ] For hotel and lodging profiles, Google says booking links and prices come from Google Hotel Ads and free booking links ([manage your hotel's details](https://support.google.com/business/answer/9177958)). The owner can't type a booking link into those profiles, so the Website field is the place for our link.
  - [ ] Free booking links show the property's own rates next to OTAs at no cost. Rates have to reach Google through a connectivity partner such as a channel manager, booking engine or PMS. Google says "direct integration with Google is currently unavailable due to high demand" ([hotel owners: share your rates](https://support.google.com/hotelprices/answer/11946931), [about free booking links](https://support.google.com/hotelprices/answer/10472393)).
  - [ ] If the owner's channel manager is a Google partner, ask them about free booking links. Otherwise, the Website field is all an independent villa can set.
  - [ ] If the profile shows a **Bookings** link option, which is not the usual case for lodging, add the same ready link there. Never use an OTA or social media URL, or a link shortener ([business links policy](https://support.google.com/business/answer/13769188)).
- [ ] **Photos.**
  - [ ] Add a logo, a cover photo, then rooms, views, bathrooms, the pool or garden, the entrance and the street view.
  - [ ] Requirements: JPG or PNG, 10 KB–5 MB, 720 × 720 px recommended. No heavy filters: Google says photos must "represent reality".
  - [ ] Photos only appear once the profile is verified ([add photos](https://support.google.com/business/answer/6103862)).
- [ ] **Reviews: ask every guest, not just the happy ones.**
  - [ ] Get the review link or QR code from the profile on a computer, then add it to the check-out message and the thank-you email ([review link or QR code](https://support.google.com/business/answer/16816815), [tips to get more reviews](https://support.google.com/business/answer/3474122)).
  - [ ] Don't offer discounts or gifts for reviews.
  - [ ] Don't send only happy guests to Google or steer unhappy ones away. Google's policy forbids "selectively solicit[ing] positive reviews".
  - [ ] Don't pressure guests to review while they are on the premises.
  - [ ] No reviews from staff or family ([fake engagement policy](https://support.google.com/contributionpolicy/answer/7400114)).
  - [ ] Reply to every review, short and specific. Never share a guest's private details.

### Local guide
- [ ] In the Setup tab, fill in **How to get here**, **Things to do** and **Best time to visit**. Use AI to write a draft if you like, then check every fact.
- [ ] Publish each block in **every language the property gets guests from** (en, si, de, fr, hi). An unpublished translation does nothing for search in that language.
- [ ] Make sure the facts match the Business Profile, including the address, directions and phone number.
- [ ] Tick off the launch checklist in the tab.

### Tripadvisor
- [ ] Search Tripadvisor for the property. If it is already listed, claim it at [tripadvisor.com/Owners](https://www.tripadvisor.com/Owners) and confirm that you are the owner.
- [ ] If it isn't listed, use the [Get Listed form](https://www.tripadvisor.com/GetListedNew).
- [ ] Eligibility: accommodation listings need several rooms or units and must be able to host more than one booking at a time. A villa let only to one group at a time does not qualify. Tripadvisor has also paused onboarding of new vacation rentals ([accommodation listing guidelines](https://tripadvisorsupport.com/hc/en-us/articles/200614697-Accommodation-listing-guidelines)).
- [ ] The listing itself is free. A clickable **website link** on an accommodation listing is part of the paid **Business Advantage** subscription, and the price varies by property ([Business Advantage FAQ](https://www.tripadvisor.com/business/business-advantage/frequently-asked-questions)). Decide on it only once the property has reviews coming in.

### Facebook and Instagram
- [ ] Add the site URL to the Facebook Page's contact or website field and to the Instagram profile's links. Use the plain site URL, or the same link with `utm_source=facebook` or `utm_source=instagram`.
- [ ] Use the same name, address and phone as on the site and the Business Profile.

---

## 3. First 10 backlink targets

These are real places where a small Sri Lankan villa, guesthouse or homestay can get a listing or a link. All of them were checked on 2026-11-05.

**Spam warning.** Google treats these as **link spam**:
- buying or selling links that pass ranking
- excessive link swaps
- "low-quality directory or bookmark site links"
- automated link building

Paid listings and adverts must carry `rel="sponsored"` or `rel="nofollow"` ([Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)). Turn down anyone who sells "100 backlinks" or "guest posts". Membership of a real trade body is fine.

| # | Name | URL | Kind of link or listing | Cost | How to apply |
|---|---|---|---|---|---|
| 1 | Sri Lanka Tourism: Hotels & Other Accommodation (srilanka.travel, run by the Sri Lanka Tourism Promotion Bureau and built by SLTDA) | https://www.srilanka.travel/hotels_and_other_accomodation | Official directory of **SLTDA-registered** stays: home stays, guest houses, bungalows, boutique villas, rented homes and more. Entries show the SLTDA number and contact details, which can include the website. | Listing free. SLTDA registration and licence fees apply. | Register with SLTDA (registration is mandatory for tourism businesses) at https://www.sltda.gov.lk/register-with-us via the eServices portal. A homestay means up to 4 bedrooms in the host's own home. Ask for the website to be included. |
| 2 | The Hotels Association of Sri Lanka (THASL) | https://www.thasl.lk/members/list-of-members | Member directory with a **"Visit Website"** link for each member | Paid membership. Boutique hotels and villas: Rs 25,000 entrance fee, plus Rs 10,000 a year or Rs 500 per room, whichever is higher | SLTDA-approved properties only. Written application with a proposer and seconder, the SLTDA certificate and the BRC: https://www.thasl.lk/members/become-a-member |
| 3 | Sri Lanka Tourism Alliance | https://www.srilankatourismalliance.com/resources/members | Member directory profile. No outbound website link was visible in the directory when checked. | Free ("currently free") | Register online: https://www.srilankatourismalliance.com/about-us/join-the-alliance/ |
| 4 | ASMET (Association of Small and Medium Enterprises in Tourism) | https://www.asmetsrilanka.com/member-list/ | Member list under "Accommodation Providers" showing name, address, phone and email. **No website link** shown. Useful as a consistent NAP citation. | Not stated | "Apply now" form on the site. Needs a business registration, the current SLTDA licence and audited accounts. |
| 5 | Your regional hoteliers or tourism association, for example Hikkaduwa Hoteliers, Bentota Beruwala Hoteliers, Hoteliers of South & Deep South, East Coast Hoteliers, Kandy Hoteliers, or the Sigiriya Tourist Guest House Owners association | SLTDA list of tourism associations (April 2021): https://sltda.gov.lk/storage/common_media/Tourism_Associations_of_Sri%20Lanka2105427549.pdf | Membership, local referrals, and a link only if the association runs a website. None of these had a member directory online when checked. | Unknown. Ask the association. | Contact the association for your area, using the details in the SLTDA list. Check that the contacts are still current. |
| 6 | LankaHolidays.com | https://www.lankaholidays.com/ | Sri Lanka holiday-rental directory (villas, bungalows, guest houses). Enquiries go through the site and **no outbound website link** was shown. Brings referral enquiries, mostly from local guests. | Free ("All ads are completely free") | "List property" / "Post an ad" → create an account |
| 7 | Rainbow Pages (SLT-Mobitel national business directory) | https://rainbowpages.lk/hotels/ | Business directory with hotel categories by town (Ella, Galle, Kandy and others). A NAP citation. | Unknown. Paid advertising exists, so check the rate card before paying. | Advertiser sign-up: https://rainbowpages.lk/merchant/register.php, or call 1212 |
| 8 | Wikivoyage (the page for your town, for example https://en.wikivoyage.org/wiki/Weligama) | https://en.wikivoyage.org/wiki/Wikivoyage:Don%27t_tout | A factual "Sleep" listing with one website URL. Links are **nofollow**, so this brings travellers, not ranking. | Free | Add one listing to the article for your town. Follow "Don't tout": no "we/our", no superlatives, one URL, listed in one place only. |
| 9 | Your own activity partners: surf schools in Weligama or Arugam Bay, dive centres, yoga studios, cooking classes, cafés | Their own websites | A "where to stay" or "partner" mention on their site, and you link back to them from the local guide's "Things to do" block | Free | Ask partners you really work with and send guests to. Keep it to real relationships, not link swaps for their own sake. |
| 10 | Your own transport and tour partners: SLTDA-registered drivers, guides, tuk-tuk and safari operators | Their own websites. Registered guides and travel agents are also listed on srilanka.travel. | A recommended-stay mention or link on their site, and you link to them from the local guide's "How to get here" block | Free | Same as row 9. Pick partners who are licensed and who guests actually use. |

**Checked and left out:**
- the Surfing Federation of Sri Lanka (no official site found; its registration was suspended in 2021)
- regional or provincial tourism bureau sites (none found)
- HotelsSL.com (instant listings with no review and very little content, which is a low-quality-directory risk)
- ikman.lk (category page returned an error; posting terms unclear)
- lankainformation.lk and arugam.info (would not load)
- Time Out Sri Lanka and yamu.lk (editorial only; no listing route)

---

## Sources

- Google Search Console Help: [Add a website property](https://support.google.com/webmasters/answer/34592) · [Verify site ownership](https://support.google.com/webmasters/answer/9008080) · [Sitemaps report](https://support.google.com/webmasters/answer/7451001) · [Page indexing report](https://support.google.com/webmasters/answer/7440203) · [URL Inspection tool](https://support.google.com/webmasters/answer/9012289) · [Core Web Vitals report](https://support.google.com/webmasters/answer/9205520) · [International Targeting report is deprecated](https://support.google.com/webmasters/answer/12474899)
- Google Search Central: [Localised versions of your pages (hreflang)](https://developers.google.com/search/docs/specialty/international/localized-versions) · [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- Google Business Profile Help: [Business eligibility and ownership guidelines](https://support.google.com/business/answer/13763036) · [Guidelines for representing your business](https://support.google.com/business/answer/3038177) · [Add or claim your Business Profile](https://support.google.com/business/answer/2911778) · [Verify your business](https://support.google.com/business/answer/7107242) · [Edit your Business Profile](https://support.google.com/business/answer/3039617) · [Manage your hotel's details](https://support.google.com/business/answer/9177958) · [Business links policies](https://support.google.com/business/answer/13769188) · [Add photos](https://support.google.com/business/answer/6103862) · [Tips to get more reviews](https://support.google.com/business/answer/3474122) · [Create a review link or QR code](https://support.google.com/business/answer/16816815)
- Google Maps user-contributed content policy: [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114)
- Google Hotel Center Help: [Hotel owners — share your rates](https://support.google.com/hotelprices/answer/11946931) · [About hotel free booking links](https://support.google.com/hotelprices/answer/10472393) · [Vacation rental property managers: starter guide](https://support.google.com/hotelprices/answer/12564561)
- Bing: [Import sites from Search Console](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools) · [Sitemaps help](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)
- Tripadvisor: [Accommodation listing guidelines](https://tripadvisorsupport.com/hc/en-us/articles/200614697-Accommodation-listing-guidelines) · [Business Advantage FAQ](https://www.tripadvisor.com/business/business-advantage/frequently-asked-questions) · [Owners](https://www.tripadvisor.com/Owners) · [Get listed](https://www.tripadvisor.com/GetListedNew)
- Sri Lanka: [SLTDA — Register with us](https://www.sltda.gov.lk/register-with-us) · [srilanka.travel accommodation directory](https://www.srilanka.travel/hotels_and_other_accomodation) · [SLTDA list of tourism associations](https://sltda.gov.lk/storage/common_media/Tourism_Associations_of_Sri%20Lanka2105427549.pdf) · [THASL](https://www.thasl.lk/) · [Sri Lanka Tourism Alliance](https://www.srilankatourismalliance.com/) · [ASMET](https://www.asmetsrilanka.com/) · [LankaHolidays.com](https://www.lankaholidays.com/) · [Rainbow Pages](https://rainbowpages.lk/) · [Wikivoyage: Don't tout](https://en.wikivoyage.org/wiki/Wikivoyage:Don%27t_tout)

_Links last checked: 2026-11-05._
