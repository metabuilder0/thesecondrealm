import os, json, math
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mk.py')).read().split("if __name__")[0])
cfg = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'example_spam_in_the_sky_circuit.json')))

TEXTS = {
 'Spam in the Sky': (
  "Spam in the Sky",
  "Welcome aboard. In this realm, each block is positioned by the number of transaction outputs it spends, along the X axis, the number of new outputs it creates, along the Z axis, and its height, along the vertical axis.\n\nMost blocks huddle in the column ahead of us. When spammers flood the network, their blocks drift away from it, like clouds in the sky."),
 'The First Dust Storm': (
  "The First Dust Storm",
  "Only the blocks mined during the second half of 2011 remain visible.\n\nOn September 4, 2011, in less than four hours, a spammer flooded the network with transactions each creating 102 tiny outputs. Look to the right of the column, at our altitude: that thin line of scattered stars is the attack. Some of its blocks created up to 13,000 outputs, instead of a hundred or so."),
 'Satoshi Dice': (
  "Satoshi Dice",
  "We are now climbing through 2012 and 2013.\n\nIn April 2012, a betting game called SatoshiDice went live. Every bet was a transaction, and even losing bets received a tiny payment back. On your right, the column swells: within three weeks, the number of transactions per block more than tripled. In 2013, Bitcoin Core answered with a dust threshold, refusing to relay outputs too small to be worth spending."),
 'Summer 2015': (
  "The Summer of 2015",
  "Below us lies the summer of 2015, when so-called stress tests flooded the network with transactions creating dozens of outputs each.\n\nLook at the dense straight line below: this edge is the 1 megabyte limit itself. A full block holds a few thousand inputs, or about twenty thousand outputs, but no more. In six weeks, unspent outputs grew from 21 to 33 million."),
 'Megatransaction': (
  "The Megatransaction",
  "Only seven blocks remain, below us and slightly to the left.\n\nOn July 7, 2015, the mining pool F2Pool filled block 364,292 with a single transaction gathering 5,569 spam outputs into one, for a fee of zero. Because of the way signatures were hashed, verifying such a transaction took tens of seconds. This weakness, known as quadratic hashing, would only be fixed two years later."),
 'Great Sweep': (
  "The Great Sweep",
  "Just left of center, notice a tight knot of stars.\n\nDuring the July flood, the spammers had also created outputs that anyone could spend, without a signature. On August 1, 2015, they were swept away: nine blocks each carried a transaction gathering 20,000 of them. Further to the right, block 367,853, mined the same night, holds 12,239 transactions, the most crowded block of this whole realm."),
 'SegWit': (
  "Segregated Witness",
  "All blocks are visible again. We are flying through 2017.\n\nOn August 24, 2017, at block 481,824, Segregated Witness activated. It fixed quadratic hashing and moved signatures into a separate witness area, counted at a quarter of their weight. Blocks could now exceed one megabyte. Few imagined that this discount would one day make it cheaper to store pictures in the blockchain."),
 'Inscriptions': (
  "The Inscriptions",
  "Above us hangs the red ceiling of 2023.\n\nIn January, the Ordinals protocol started inscribing images and texts into the witness of Taproot transactions. In spring came BRC-20 tokens, minted by millions of tiny transactions. Fees soared, and the network saw its most crowded blocks since 2015. Each inscription sits on its own small output, and the set of unspent outputs swelled to a record size."),
 'Closing': (
  "Clouds Will Come Back",
  "Looking down, the whole history of Bitcoin lies beneath us. Every wave of spam drifted away from the column, then the sky cleared.\n\nEach left lessons behind: fees to price block space, dust limits, SegWit. Whether storing data in blocks is spam or legitimate use is still hotly debated. But as long as block space is open to all, new clouds will form."),
}

stages = []
for s in cfg['stages']:
    st = {'coords': w2d(s['w'])}
    if s['title'] in TEXTS:
        st['title'], st['desc'] = TEXTS[s['title']]
    else:
        st['title'] = s['title']
    if s.get('filters'):
        st['filters'] = s['filters']
    stages.append(st)
    if 'desc' in st:
        print(f"{st['title']:24s} {len(st['desc'].split())} words  coords={st['coords']}")

tour = {
  'version': '0.2.0',
  'type': 'autopilot',
  'title': 'Spam in the Sky',
  'lang': 'en',
  'voice_level': '2',
  'music_level': '0.3',
  'coords_type': 'data_series',
  'stages': stages,
}
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../static/tours/spam_in_the_sky_2.json'), 'w').write(json.dumps(tour, indent=2, ensure_ascii=False) + '\n')
cam = cfg['camera']
print('camera', [round(v) for v in cam['pos']], round(cam['yaw'], 4))
