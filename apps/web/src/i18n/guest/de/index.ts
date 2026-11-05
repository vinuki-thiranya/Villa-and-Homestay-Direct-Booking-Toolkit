import type { Dict } from '../t';
import type { en } from '../en';
import { common } from './common';
import { layout } from './layout';
import { home } from './home';
import { search } from './search';
import { rooms } from './rooms';
import { room } from './room';
import { pages } from './pages';
import { guide } from './guide';
import { book } from './book';
import { booking } from './booking';
import { pay } from './pay';
import { addons } from './addons';
import { invoices } from './invoices';
import { review } from './review';
import { policy } from './policy';

export const de: Dict<typeof en> = { common, layout, home, search, rooms, room, pages, guide, book, booking, pay, addons, invoices, review, policy };
