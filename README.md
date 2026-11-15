# Papers, decoded

Papers and essays I'm learning from, rebuilt as interactive guides that anyone can follow.

**Live site:** https://notsoweedy.github.io/papers-decoded/

| Guide | Original | What you'll learn |
|---|---|---|
| [How a Transformer reads a sentence](https://notsoweedy.github.io/papers-decoded/transformer/) | [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/), Jay Alammar, 2018 (CC BY-NC-SA 4.0) | Self-attention, queries, keys and values, multi-head attention, positional encoding, masking, greedy decoding and beam search |
| [Where does your GPU's time go?](https://notsoweedy.github.io/papers-decoded/brrr/) | [Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html), Horace He, 2022 | Compute-bound vs memory-bound vs overhead-bound, operator fusion, compute intensity, CUDA Graphs |

## How it's built

Plain HTML, CSS and JavaScript. There's no build step and nothing to install. Each guide lives in its own folder and runs on its own:

```
index.html        the list of guides
brrr/             Making Deep Learning Go Brrrr
  index.html
  styles.css
  app.js
transformer/      The Illustrated Transformer (same three files)
.nojekyll         tells GitHub Pages to serve files as they are
```

## Preview locally

```powershell
cd C:\Users\vidhibansal\papers-decoded
python -m http.server 8765
```

Then open http://localhost:8765/. Opening `index.html` directly also works.

## Add a new paper

1. Create a folder with a short name, for example `flash-attention/`, with its own `index.html`.
2. In the guide's header, link back to the list with `<a href="../">Papers, decoded</a>`.
3. Add an entry at the top of the list in the root `index.html` and a row to the table above.
4. Commit and push. GitHub Pages republishes in about a minute.

## Publish

GitHub Pages serves the `main` branch from the repository root. The first time, run `.\publish.ps1`. It signs you in to GitHub, creates the repo, pushes, and turns on Pages. After that, `git push` is enough.

## Credits

Each guide links to the work it explains. The ideas, figures and numbers belong to the original authors; the guides only re-explain them.
