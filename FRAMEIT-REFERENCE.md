# FrameIT public bundle inventory

Snapshot taken 21 November 2026 from the [Telegram listing](https://t.me/frameit_bot) and [Mini App entry page](https://app8772859563.tgcloud.ai/). The entry declares a JavaScript module and a stylesheet. Following their public asset references returned 25 JavaScript files and two stylesheets, listed below with the byte size and SHA-256 of each retrieved file. The main bundle reports React 18.3.1.

## Client features

The Telegram listing advertises framing screenshots and screen recordings. The provided screenshot shows upload, templates, Home, Drafts, and Settings. Public client modules also reference device and finish presets, angle and position controls, screen cleanup and status-bar time, card layouts, multiple screenshots, markup, tap rings, watermarks, video trim and split, sound trims, GIF and video exports, share actions, history, and appearance and haptic settings. The client includes Pro and credits screens. Exact plan limits, authenticated behavior, and backend implementation could not be verified from the public assets.

The [public device manifest](https://app8772859563.tgcloud.ai/devices/devices.json) advertises models named iPhone 18 Pro Max, iPhone 18 Pro, iPhone Air, and two iPhone Duo entries. These are the app's catalog labels. The manifest provides screen geometry and references image frame artwork. The client also references [template images](https://app8772859563.tgcloud.ai/templates/cyan.jpg), [animation JSON](https://app8772859563.tgcloud.ai/stickers/utya-desk.json), and a [font file](https://app8772859563.tgcloud.ai/fonts/Inter-SemiBold.woff2).

## Public code files

| File | Bytes | SHA-256 | Role indicated by code or filename |
| --- | ---: | --- | --- |
| [AppearancePage-Brlrwl7o.js](https://app8772859563.tgcloud.ai/assets/AppearancePage-Brlrwl7o.js) | 4472 | d3245f5be78a8e605211c19fa55b734f2268855758da27af34698478666c1b65 | Appearance settings |
| [ButtonSpinner-kIK-uAN5.js](https://app8772859563.tgcloud.ai/assets/ButtonSpinner-kIK-uAN5.js) | 755 | b1b7abe4c034157a8d1e0549d8d466377073a3fe644bdd953782efbff81cb476 | Button loading UI |
| [cleanWorker-BDKx0L4g.js](https://app8772859563.tgcloud.ai/assets/cleanWorker-BDKx0L4g.js) | 10292 | 7fc7078b56c011f8de073b5d491fa34589777d7a1338d9e241ebbeee0913a00c | Screen cleanup worker |
| [CoinHost-B9RApIRk.js](https://app8772859563.tgcloud.ai/assets/CoinHost-B9RApIRk.js) | 2589 | 470df0dd30cbda57486c0237b0ecf23755fc232a1505ad90d9c6da360156d29e | Credits UI shared component |
| [CreditsPage-CAybWnDT.js](https://app8772859563.tgcloud.ai/assets/CreditsPage-CAybWnDT.js) | 4486 | c0168cf5060c82307bc9dab8f7a2af9a68c9b5f7f33f5c1523fcd8272c94d390 | Credits screen |
| [DraftsPage-Bjeb8p2g.js](https://app8772859563.tgcloud.ai/assets/DraftsPage-Bjeb8p2g.js) | 10871 | edabde7ed73b6bc3ecb9c238acd130317d1bc759e0995560fdcc6bed331e95f6 | Saved drafts |
| [DuckScreen-rHSPG315.js](https://app8772859563.tgcloud.ai/assets/DuckScreen-rHSPG315.js) | 2623 | 3bf1c705cfb6d2b7fd82d0a5f4f6ceb384f10687defb130eab4dde5ed6706623 | Animated state UI |
| [dust-DcCDhvxq.js](https://app8772859563.tgcloud.ai/assets/dust-DcCDhvxq.js) | 6081 | 8e1cebb7089fa4c4225a122ab107bcb953f38028b079445fafed820abb0c15af | Visual-effect helper |
| [Editor-CgN_jKxW.css](https://app8772859563.tgcloud.ai/assets/Editor-CgN_jKxW.css) | 6972 | 4210771cbc00d50da1b2a3e78ab3baf56e628d68bd2a089802bc4fe68ea72696 | Editor styles |
| [Editor-EnEHu2Nk.js](https://app8772859563.tgcloud.ai/assets/Editor-EnEHu2Nk.js) | 384132 | b02080d4c706738e5f006113bfa807ac00fcd8dedd6d02364cf5512272ca8742 | Editing controls, live preview, media and timeline |
| [encodeWorker-I-k3rlQ9.js](https://app8772859563.tgcloud.ai/assets/encodeWorker-I-k3rlQ9.js) | 400 | 71eec2aa9346d87f70cc6fa5bc2f35357e78dabb63ab8bddb622d4e17352836e | Encoding worker entry |
| [gifExport-CXDQhnz-.js](https://app8772859563.tgcloud.ai/assets/gifExport-CXDQhnz-.js) | 10253 | 72dcaeaa3a201ed3874e55b6ad973ebfc5795bebd257723cea084c6181b3b60a | GIF export |
| [HistoryPage-BOz-0uS9.js](https://app8772859563.tgcloud.ai/assets/HistoryPage-BOz-0uS9.js) | 9797 | 56da9ae2a5f37f96205fd41715d57992933d3b391364380ff14aeea6bdd1e277 | History view |
| [id3-P1S6dHV9.js](https://app8772859563.tgcloud.ai/assets/id3-P1S6dHV9.js) | 496247 | d85703d6918bec21259d36de8e965d9f9a49144fdea03b42060d0ea30c337224 | Media-related dependency |
| [index-v10z0g72.js](https://app8772859563.tgcloud.ai/assets/index-v10z0g72.js) | 39066 | 7a37f4ae7ec410e6a40ac0a38be0ace2b5285533153638c29053ef8cd5792df8 | Shared dependency chunk |
| [lottie_light-DPImEQwD.js](https://app8772859563.tgcloud.ai/assets/lottie_light-DPImEQwD.js) | 169959 | f14090e8eae8278f8c375345a060658e78970a010803741f7ccd1fc92ab9ec37 | Lottie animation runtime |
| [MyStylePage-BwVb4OFL.js](https://app8772859563.tgcloud.ai/assets/MyStylePage-BwVb4OFL.js) | 2318 | a128426c9acfd949b9db38de1e26804eceb7f1e874240b8eb23792edc93baec3 | Saved looks or style preferences |
| [output-QKbsRkcU.js](https://app8772859563.tgcloud.ai/assets/output-QKbsRkcU.js) | 210831 | 2ad3c8f101b4c266cd1f5c9e5f5dd187f9109538f4189c175703dc85fa378b9d | Output and encoding support |
| [ProPage-oHmgzEwf.js](https://app8772859563.tgcloud.ai/assets/ProPage-oHmgzEwf.js) | 5940 | ccc6217f120ed366edbd89bf3e5dad3cda94c0b30cc5613e5415527f30296cfa | Pro screen |
| [index-Dwc-oovE.css](https://app8772859563.tgcloud.ai/assets/index-Dwc-oovE.css) | 177909 | f5568ecb61e7ea8b34d10f85ff7b0bf5c2403c21b61b33a0306fd3e21c5b3e4e | Shared styles and screens |
| [index-Dyw5eYGB.js](https://app8772859563.tgcloud.ai/assets/index-Dyw5eYGB.js) | 570910 | 68f2e107b1df67dee1f0d1cd988fe7b80e0598601a2d9b72297c1159d464a2d2 | App entry, React 18.3.1, launch, template previews, shell and routing |
| [scrubWorker-CMa12r5G.js](https://app8772859563.tgcloud.ai/assets/scrubWorker-CMa12r5G.js) | 406471 | 59df0040cb25842e5e1c381efa1199c6b93a47e5aa274735210572ee227e675e | Timeline scrub worker |
| [Spinner-BpdClAao.js](https://app8772859563.tgcloud.ai/assets/Spinner-BpdClAao.js) | 23371 | 98d3d9bb341df4aa816d7bbbcfac63ed53da2408f990bf3dca49ceb3f32cb405 | Loading UI |
| [StatsPage-n7srjXtC.js](https://app8772859563.tgcloud.ai/assets/StatsPage-n7srjXtC.js) | 12761 | df62dc0198ab5ab7ffbf8bc8534d60113087867e97d729b3b88a8f9c8a26b240 | Statistics |
| [videoExport-BjSI6CTx.js](https://app8772859563.tgcloud.ai/assets/videoExport-BjSI6CTx.js) | 12762 | 273379dc440af9c92a693058494a54aaff324d0b16ddfcfe307f3afe34ef5a2a | Video export |
| [VideoProbe-BrrRZkj5.js](https://app8772859563.tgcloud.ai/assets/VideoProbe-BrrRZkj5.js) | 19673 | e4917aab83dc77e93e896767ff9aa1a32e88ec422edbedd8e44c92bb174b68f8 | Video probing |
| [videoThumbs-CzHTnQ9a.js](https://app8772859563.tgcloud.ai/assets/videoThumbs-CzHTnQ9a.js) | 2481 | 1eb0d1dcdf25fcdea0575857b98ef496e8594d5c0f47eb9d23489927fe91d367 | Timeline thumbnails |
