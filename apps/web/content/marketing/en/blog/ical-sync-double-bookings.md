---
title: "iCal sync: avoid double bookings on Airbnb and Booking.com"
description: "How iCal calendar sync works between Airbnb, Booking.com and your own site, why double bookings still happen, and the habits that prevent them."
date: "2026-10-04"
readingMinutes: 6
keywords: ["iCal sync", "avoid double bookings", "Airbnb Booking.com calendar sync", "sync Airbnb and Booking.com calendars", "channel manager Sri Lanka", "double booking guesthouse"]
cluster: "operations"
---

A double booking is the worst phone call of the season. Two families, one room, and usually a bad review whichever way you solve it. Most small properties in Sri Lanka connect their calendars with iCal links, which is free and works well, as long as you understand its limits. This guide explains how it works, where the gaps are, and how to close them.

## What iCal sync actually does

An iCal link is a web address ending in `.ics` that lists the dates a room is unavailable. Each platform gives you an export link for each listing, and lets you import links from other places.

When you connect Airbnb, Booking.com and your own booking site, each one regularly fetches the others' links and blocks those dates. That is all it does:

- **It carries dates only.** No guest names, prices, or number of guests.
- **It does not sync prices or rules.** Rates, minimum stays and discounts must be set on each platform.
- **It is not instant.** Each platform fetches on its own schedule.

That last point is where double bookings come from.

## How often each platform updates

Airbnb says imported calendars [update automatically every 3 hours](https://www.airbnb.com/help/article/99), and you can press refresh on a connected calendar to update sooner. The same page notes that Airbnb limits how often it can request updates from other sites, that the import link must end in `.ics`, and that it imports up to 2 years of dates.

Booking.com also fetches iCal links on its own schedule. We could not find a fixed interval in its public help pages, so plan as if it takes a few hours, not minutes.

Your own booking system has its own schedule too. StayDirect LK fetches each import link every 15 minutes, but that only covers our side. The slowest platform in the chain sets the size of your risk window.

## How a double booking happens

Here is an example timeline, with assumed times, for one room listed on Airbnb, Booking.com and a direct site:

| Time | What happens |
|---|---|
| 10:05 | A guest books 12–15 March on Booking.com |
| 10:20 | Your booking site fetches Booking.com and blocks the dates |
| 11:40 | A different guest books the same dates on Airbnb, which has not fetched yet |
| 13:05 | Airbnb's next update finally blocks the dates, too late |

Neither platform did anything wrong. The gap between two fetches was simply wide enough for a second booking to land. The busier the dates, the more likely this is, which is why it tends to happen in peak weeks.

## Set it up so the gaps are small

### One calendar per room

Connect each physical room to its own listing on each platform. If your "Deluxe Double" on Booking.com is really two rooms, you need room-level calendars on your own system so that one booking does not block both rooms, or neither.

### Use a hub, not a chain

Connect Airbnb and Booking.com each to your own calendar, and your own calendar back to each of them. Avoid chaining Airbnb to Booking.com and Booking.com to your site: every extra hop adds another wait.

### Refresh after every OTA booking

When a booking arrives, press refresh on the other platforms' imported calendars. On busy days this one habit closes most of the risk window.

### Add a buffer where you can

A one-night gap after each stay for cleaning, or an advance-notice rule on the OTAs for same-day bookings, reduces the number of tight turnarounds where a late sync can hurt.

### Block manually for anything off-system

A friend staying for free, a room under repair, a phone booking you have not entered yet: block it straight away, on the calendar that feeds the others.

## Watch the sync, not just the bookings

iCal links break quietly. A listing gets duplicated, a link is regenerated, or a platform has an outage, and the calendar simply stops updating. Check once a week that each imported calendar shows a recent "last updated" time. If one has not updated for a day, reconnect it.

## If a double booking happens anyway

1. **Act fast.** Contact the guest whose booking came second as soon as you notice.
2. **Offer a real solution.** A comparable or better room nearby at the same price, with transport, is much better than a cancellation message.
3. **Use the platform's own process.** If the booking is on an OTA, follow its cancellation or relocation route so your account is not penalised more than necessary.
4. **Find the cause.** Was it a broken link, a missed manual block, or the timing gap? Fix the cause, not only the booking.

## Checklist

- [ ] Each room has its own listing calendar on each platform.
- [ ] Airbnb and Booking.com both import your own calendar, and your calendar imports both.
- [ ] Every import link ends in `.ics` and shows a recent update time.
- [ ] You refresh imported calendars after each OTA booking in peak weeks.
- [ ] Same-day bookings are limited on the OTAs, or a cleaning buffer is set.
- [ ] Manual blocks are entered in one place only.
- [ ] You have a nearby property you can call to relocate a guest.

## How StayDirect LK helps

StayDirect LK gives each room an export link for Airbnb and Booking.com and up to five import links, fetched every 15 minutes, with a "sync now" button. If two channels book the same night, you get a WhatsApp alert with both booking references, and the owner app shows when each link last synced so a broken one does not go unnoticed. See the plans on our [pricing page](/pricing), and read [what Booking.com commission really costs](/blog/booking-com-commission-maths) or [how to take deposits](/blog/deposits-payhere-lankaqr) for your direct bookings.
