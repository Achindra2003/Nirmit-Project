We're building Nirmit.
Here's the world we're in right now. Millions of Indian families renovate or furnish a flat every year — their second biggest expense after the home itself. But the process is broken. The expensive route is Livspace or DesignCafe: professional design, but a ₹5 lakh minimum, locked to their contractors, takes weeks, and feels like a sales trap. The cheap route is your neighbourhood carpenter who's great at building but isn't a designer. He needs you to tell him exactly what you want. So you stand in an empty room, point at walls, and hope it turns out okay. There's no middle path where you can actually *see* your flat designed before you commit money.
We're creating that middle path.
Priya and Rohan just bought a 2BHK in Thane. They have a four-year-old, Rohan's mother stays with them often, and they've accumulated a lot over the years. They want a living room that feels like home: family movie nights on a big sofa, a proper pooja space that faces east, enough storage to hide the toys and the clutter, a small desk for late-night work, all Vastu-respecting because Rohan's mother believes in it. Their budget is about ₹3 lakhs. They've been scrolling Pinterest for months but nothing matches their actual flat. Livspace quoted ₹7 lakhs. Their carpenter Suresh is ready to work but keeps asking "madam aap batao kahan kya chahiye." They're stuck.
Here's what we want to exist for Priya and Rohan.
They open Nirmit. It feels warm, Indian, premium — not like a western tool. They answer a few questions. Not a form, more like someone understanding their life: what kind of home, which room, how big, what style appeals to them, who lives there, what activities happen in that room, what they absolutely need, budget, Vastu beliefs. The system listens.
Then instead of giving them a blank floor plan and a furniture catalog, Nirmit generates complete, fully furnished visions of their actual room. Not just one — multiple ways it could be. But it doesn't just spit out five rigid "styles." It understands that Priya might want the mandir placement from one idea, the storage density from another, and the open feel from a third. The system adapts. Priya can mix, tweak, and refine — either by telling an AI designer what she wants in plain language ("Make the sofa bigger, dark leather"), or by manually adjusting things herself. Every change shows updated costs instantly.
When she's satisfied, she gets a quotation she can hand directly to Suresh — real product names, real prices, clear instructions. No lock-in, no minimum budget.
The entire experience should feel like a service. Priya never feels like she's "using a tool." She feels like someone understood her life and her flat and gave her possibilities she couldn't have imagined alone.
That's what we need you to build.
You have complete freedom to decide how this works — how the intake flows, how the generation happens, how the design mixing works, how the AI assistance feels, how the catalogue of furniture comes alive. You can think about whether to use existing code or start fresh, whether to generate from a massive furniture catalog or let users explore combinations differently. The only thing that matters is that at the end, Priya feels like she just experienced something that was impossible before Nirmit existed.
We've already built some underlying pieces if you want to use them — a catalog of Indian furniture, a room layout engine, some 3D viewing components, a quotation generator. But you're not bound to any of it. If something doesn't serve the vision, change it or replace it. The project files are in front of you.
The product is called Nirmit.

What Nirmit Has to Be
The framing in the brief is correct but incomplete. "The middle path between Livspace and the local carpenter" is a market positioning statement. It doesn't tell you what the product is experientially. And the experiential definition is everything — because Nirmit isn't competing on features. It's competing on a feeling.
Here is the feeling Nirmit has to create: the feeling of being understood by someone with great taste who also happens to know your budget.
That's it. That's the whole product. Everything you build either produces that feeling or dilutes it. When you make decisions — about the intake flow, about what the reveal looks like, about how the AI responds, about what the quotation says — the test is always: does this make Priya feel understood by someone with great taste?
Now let me go deep on every layer of what that means.

The Emotional Arc Is the Product
Most product teams think about features. Nirmit should be thought about in terms of emotional states — where Priya is when she arrives, and where she needs to be when she leaves.
When Priya opens Nirmit, she's in a specific psychological state. She's excited about the new home and anxious about the money. She's been scrolling Pinterest for months but nothing matches her actual flat. She feels overwhelmed by choice and under-resourced in taste and knowledge. She's been burned once — Livspace quoted ₹7 lakhs and she felt like a sales target. She doesn't fully trust that anything can understand what she actually wants because the things she wants are specific and Indian and layered: it needs to respect Vastu and feel contemporary, it needs maximum storage and feel open, it needs to work for movie nights and daily pooja and occasional guests and a four-year-old and Rohan's mother.
The experience has to move her through five emotional states in sequence:
Overwhelmed → Understood → Excited → Confident → Ready to act.
Every screen, every piece of copy, every AI response, every design decision maps to one of these states. The intake is about moving from overwhelmed to understood. The reveal is understood to excited. The refinement is excited to confident. The quotation is confident to ready to act.
If any screen moves her backwards — if the intake makes her feel more overwhelmed, if the reveal makes her feel uncertain, if the refinement chat makes her feel like she's operating a tool rather than talking to a designer — the product has failed at that moment. The fix is never "add more features." The fix is always "return to the emotional state question."

The Intake Is Where Trust Is Built or Destroyed
The intake is the most underrated part of this product. Most teams spend their energy on the reveal and the planner. But the intake is where Priya decides whether Nirmit understands her. If the intake feels like a form, the entire subsequent experience is discounted — she's now filling in a questionnaire and expecting a generic output. If the intake feels like the beginning of a relationship, she's now expecting something made for her.
The questions you ask are a signal. Every question tells Priya something about what Nirmit thinks matters. "What is your room size?" says: we think about dimensions. "Who sits in your home most often, and where do they sit?" says: we think about how people actually live.
The intake questions need to be redesigned around the principle that a good question reveals more than it asks. Some examples of what this looks like in practice:
Instead of "family profile" with checkboxes — ask "Tell me who this room is really for." The answer to this tells you age distribution, usage patterns, and also gives Priya the experience of feeling seen. If she says "it's mostly for my mother-in-law's afternoon naps and my son's playtime," that's a design brief that no checkbox captures.
Instead of "must-haves" with a catalog — ask "Is there anything about your current room that drives you crazy?" The answer tells you exactly what problem to solve, and it gives Priya the experience of venting to someone who's listening. That emotional moment of "finally someone is asking the right question" is worth more than any feature.
Instead of "Vastu preference: yes/no/somewhat" — ask "Does Vastu matter in how this room feels to you or to someone in your family?" The framing of "or someone in your family" is important — it gives permission to say "it matters to my mother-in-law" without the person feeling like they need to personally believe in it. This is culturally crucial. A lot of families navigate Vastu as a respect gesture rather than a personal conviction, and that distinction changes the design differently.
The intake should also include a question that no design tool currently asks: "What's one thing in your current home that you love and want to keep?" This question does three things. It acknowledges that Priya's home has history, not just potential. It gives Nirmit a concrete constraint (the inherited sofa, the grandmother's brass lamp, the painting bought on their honeymoon). And it makes the subsequent design feel like it was built around her life rather than a blank slate.
The intake should feel like talking to an attentive friend who happens to be a designer. The pacing should be unhurried. One question at a time. Responses that acknowledge what was said before asking the next thing. Never make Priya feel like she's filling in a form — make her feel like she's being listened to.

The Reveal Is the Entire Product
Everything else is setup. The reveal is the moment that justifies Nirmit's existence.
The reveal is not a floor plan. Floor plans are how professionals and contractors think. Priya doesn't think in floor plans. She thinks in feelings, in the quality of morning light, in whether the room will feel cramped or open when the whole family is there. She thinks in "what will guests see when they walk in" and "will this feel like home."
The reveal needs to show the room as an experience, not as a layout. This means:
Multiple views, not multiple layouts. Don't show Priya five different furniture arrangements. Show her one arrangement from three angles: the entrance view (what you see when you walk into the room), the living view (what you see from the sofa looking toward the TV and the rest of the room), and a top-down view (for spatial understanding). Three views of one well-designed room is far more powerful than five top-down schematics.
Named visions with distinct philosophies. When you do show different options, they should feel like fundamentally different ways of living in the room, not just rearranged furniture. Call them "The Gathering" (warm, dense, every corner has character, made for evenings together), "The Breath" (open, minimal, made for peace and space), and "The Keeper" (maximum function, storage-first, nothing wasted). These names and philosophies should drive the entire design — the furniture choices, the palette, the density, the feel. A user should be able to look at the three options and immediately feel which one matches their temperament, not analyze which one has better storage.
The reveal moment needs ceremony. It should not just load a new screen. There should be a beat — a moment of anticipation, then appearance. The way a good chef presents a dish. The room reveal should feel like someone lifting a cloth, not clicking a button. This is a product design and animation question as much as anything else.
Renders over diagrams, always. The single biggest mistake you can make here is showing wire diagrams or floor plan schematics as the primary reveal. Priya cannot emotionally connect to a floor plan. She needs to see the room. This means AI-generated renders — not perfectly photorealistic (that bar is expensive and the uncanny valley is real), but warm, styled, clearly showing the room as a livable space. Even a stylized illustration with accurate proportions and real furniture silhouettes is infinitely better than a schematic.
The reveal should explain why. After showing the room, Nirmit should say — not in a tooltip or a sidebar, but prominently, in warm language — why this design was made for Priya specifically. "We put the mandir in the northeast corner where it gets morning light, because you mentioned Vastu matters to the family. We kept the center of the room clear because you have a four-year-old who needs floor space. The sofa is oversized because you said movie nights are important." This explanation transforms the reveal from "here is a generated image" to "here is something made for you." The explanation is what makes it feel like a service.

The Mixing Is a Superpower, But Only If Framed Right
The ability to mix elements from different visions is the most technically interesting feature in Nirmit. But it will only feel magical if it's framed correctly.
The wrong framing: "Mix and match modules." This sounds like a configurator. Priya doesn't want to configure things — she's already anxious about too many decisions.
The right framing: "Tell Nirmit what you love about each."
Show Priya the three visions. Then ask: "Is there anything from one of these that you'd want to bring into another?" Let her answer in plain language: "I love the open feel of option 2 but I want the pooja unit from option 1 because it faces the right direction." Nirmit regenerates. The mixing happens as a consequence of conversation, not as a UI gesture.
This is philosophically important: the mixing should always be driven by what Priya loves, not by what she's selecting from a menu. The emotional valence of love vs. selection completely changes the experience.

The Refinement Chat Is a Design Collaborator, Not a Command Interface
Once Priya has a design she's roughly excited about, the refinement chat is where the product either becomes transcendent or collapses into mediocrity.
The failure mode is a command interface: Priya types "make sofa darker" and the sofa gets darker. This works but it misses the point. It positions Priya as the operator and the AI as the executor. She still has to know what she wants and how to specify it. She still has to make all the design decisions herself.
The right model is a collaborator — an entity that has opinions, makes suggestions, explains its reasoning, and sometimes pushes back.
What does this look like in practice? If Priya says "I want to make the sofa bigger," the right response isn't just to make the sofa bigger. It's to say: "A larger sofa would definitely anchor the room better — I'd suggest going to a 3-seater with a chaise on the left, which would face the TV better. The cost goes from ₹22,000 to ₹34,000. Want me to try it?" The response demonstrates taste, explains the reasoning, shows the consequence, and asks for confirmation.
If Priya says "I want it to feel warmer," the AI shouldn't ask "warmer how?" It should make a design decision: "I can bring warmth in a few ways — the quickest is switching the wood finish from white laminate to light teak and adding a jute area rug under the coffee table. Total cost change: +₹8,000. Shall I?" Then show the result.
If Priya says something that the design can't accommodate well — "I want to add a dining table" to a living room that's already well-furnished — the AI should be honest: "A dining table would require removing the work desk or the side storage unit to maintain walkway space. Which matters more to you in this room?" Not compliant. Not a genie. A collaborator with spatial awareness and good judgment.
The AI's voice matters enormously. It should be warm and direct, with occasional Hinglish that feels natural rather than performative. It should have opinions. It should say "I think" and "I'd suggest" rather than "I can" and "would you like me to." The difference between an assistant and a collaborator is whether they have a point of view.

The Cost Display Is a Psychological Instrument
Right now, cost is probably a number that updates as furniture changes. That's correct but insufficient.
Cost has a specific psychological function in Nirmit: it should reduce anxiety, not increase it.
The way to reduce anxiety with cost is to show it in context. Not just "₹2,47,000" — but "₹2,47,000 out of your ₹3,00,000 budget. You have ₹53,000 remaining for cushions, curtains, and paint." And then: "At this cost, this design is achievable in a single phase. You don't need to break it into parts."
Cost should also be shown in comparison to alternatives that Priya already knows: "This living room design costs about 35% of what Livspace quoted you." Not to be snarky about Livspace — but because Priya has that number in her head and it's her reference point. Giving her a comparison she can emotionally anchor to is more useful than an abstract number.
And cost should never feel like a ceiling. It should feel like a parameter that Nirmit is helping her optimize. "We're currently at ₹2,47,000. I can get this to ₹2,10,000 by switching the TV unit to a carpenter build instead of a ready product — same look, ₹8,000 cheaper. Want to see?" That turn — where the AI finds savings without being asked — is deeply trust-building. It demonstrates that Nirmit is on Priya's side.

The Quotation Is a Product in Itself
The quotation that goes to Suresh is underrated. This document travels. Suresh shows it to other carpenters to get a second opinion. Priya shows it to Rohan. Rohan's mother asks to see it. Rohan uses it to negotiate with Suresh. Sometimes it gets photographed and sent on WhatsApp to someone's cousin who "knows about these things."
Because it travels, the quotation needs to work as a standalone document that tells the full story of the design to someone who has never seen the app. This means:
It needs a room sketch — not a 3D render, but a clean floor plan that Suresh can print and tape to his wall while working. With dimensions on every piece. With a North arrow. With door and window positions.
It needs item-by-item specs written for a carpenter, not a consumer. Not "Teak TV Unit (1.6m)" — but "TV Unit: 160cm wide × 45cm deep × 55cm tall. Teak veneer on MDF base. 2 open shelves, 1 drawer with soft-close Hettich channels. Back panel: painted MDF, medium grey. Hardware: brass pulls, 3cm diameter."
It needs a clear distinction between "buy this product" and "build this equivalent." For every item, show both paths: the Pepperfry product at ₹14,000, and the carpenter-built equivalent spec at an estimated ₹9,000. Suresh can build most of it. Where he can't (the sofa, the mattress, certain lights), the product link goes directly to the purchase page.
It needs a section written in Hindi for Suresh specifically. The dimensions and specs in Hindi — not translated literally, but written the way a contractor communicates with a carpenter. "दरवाजे के बायीं तरफ, दीवार से सटाकर।" That level of specificity. The Hindi section is a signal: Nirmit was made by people who understand how the actual transaction between homeowner and carpenter works in India.
And the quotation needs a validity date and a clear call to action: "This design is valid for 30 days. Product prices may change — verify at purchase. Ready to start? Here's how to get this done in the right order."

What Nirmit Is Culturally
This is where the product either wins or is just another design tool with a saffron color scheme.
Nirmit has to demonstrate, through its behaviour, that it was built by people who grew up in Indian homes and understand the specific texture of Indian domestic life. Not by adding Hindi text or using Indian brand names. By the questions it asks, the assumptions it makes or doesn't make, the way it treats things that other tools ignore.
Vastu has to be first-class, not a checkbox. Vastu is not a filter that you toggle. It's a spatial philosophy that affects which walls things go against, which directions things face, which corners are kept clear, what the entrance view looks like. A design that "respects Vastu" should feel fundamentally different from one that doesn't — not because a mandir is in a different corner, but because the entire spatial logic of the room comes from a different framework. Nirmit should be able to explain its Vastu reasoning in plain language, treating it as a legitimate design principle rather than a superstition or a preference.
Multi-generational living has to be designed for, not accommodated. A grandmother who visits often isn't a guest — she's a resident who needs a chair with arms she can push herself up from, a view of the door so she can see who comes in, proximity to the pooja space. These are design requirements that no western interior design tool would understand. Nirmit should surface them automatically when the family profile includes an elderly member.
Storage is not a feature, it's a philosophy. Indian households accumulate. Years of festival gifts, accumulated textiles, children's things at every stage, things that belonged to people who are no longer here. "Enough storage" is not a box to check — it's a design challenge that requires understanding what the things are and how they're accessed. A good Nirmit design should account for the steel almirahs that aren't going anywhere, the puja items that need a specific kind of storage, the toys that need to be hidden instantly when guests arrive.
The guest moment matters. Indian hospitality is serious. The question "what will guests see and feel when they walk in" is a genuine design requirement, not a vanity concern. The entrance view — what you see when you come through the door — should be a primary consideration in every living room design. Nirmit should ask about this directly and design for it explicitly.
Budget has a different meaning. In India, the budget conversation has layers. There's the stated budget. There's what the person would actually spend if the design was good enough. There's the negotiated budget with the contractor. There's the phase-1 budget (what gets done now) and the phase-2 intention (what gets added later). Nirmit should understand these layers — asking not just "what's your budget" but "is this a total budget or a phase-1 budget, and is there anything you might add later?" This changes the design logic significantly.

The Experience of Time
Most design tools treat the design session as a single event. Nirmit should treat it as the beginning of an ongoing relationship.
Priya doesn't finish her living room design and disappear. She comes back when the carpenter has a question. She comes back when she's ready to do the bedroom. She comes back when the sofa she chose goes on sale. She comes back to show her mother-in-law the final plan.
The product needs a concept of her home — a persistent place where her designs live, where her preferences are remembered, where the progression of her home over time is visible. "You designed your living room 8 months ago. The bedroom you mentioned wanting to do next — ready to start?" This long-term relationship framing is what turns Nirmit from a tool into something closer to a service.

The Moment That Makes the Product Real
There is one specific moment that, if it happens, means Nirmit has succeeded. Not a metric, not a retention rate. A moment.
A woman in Thane sees the render of her room. She doesn't analyze it. She doesn't think about whether the dimensions are right or whether the furniture is correctly placed. She feels something — recognition, excitement, the specific emotional quality of seeing your own home reflected back to you better than you imagined it could be. She picks up her phone and sends a screenshot to her husband with a message that says something like "I want this."
That message — sent without being prompted, without a share button, as a spontaneous act of excitement — is the product working. Everything in Nirmit should be in service of producing that moment. The intake that understood her life. The reveal that showed her something she couldn't have imagined alone. The AI that sounded like it cared. The quotation that made it feel achievable.
When that moment happens reliably, across different families, in different cities, in different budget ranges, with different vibes — Nirmit is a killer product. Before it happens consistently, it's a promising tool. The entire journey from here to there is about perfecting every element that produces that moment.

The Intake: Less Is the Answer
The instinct to make intake conversational is right. The mistake is thinking conversational means thorough. It doesn't. The best conversational intake is the one that asks the fewest questions necessary to produce a design that feels personal.
Here's the honest truth about intake: every question you add is a reason to leave. Priya came to see her room. She didn't come to answer questions about her room. The intake is friction between her and the moment she wants. Your job is to make that friction feel worthwhile — and the best way to do that is to minimize it ruthlessly.
The target: four questions, no more. Everything else gets inferred, assumed, or asked later by the AI collaborator in context.
The four questions that actually matter:
One — which room, and how big. This is non-negotiable. The solver needs dimensions. Everything else about the room — window positions, door placement — can be assumed from a standard layout for the city type, or asked later in the planner. Don't ask for precise measurements. Ask for approximate: "roughly 10×12", "medium-sized", "large open plan." The solver can work with approximations. Precision can be refined in the planner.
Two — who lives in this home. Not a checkbox grid. One open question: "Who's this room for?" Three words from Priya — "family with kids" or "me and my husband" or "joint family" — carry more design information than any checkbox set. The AI reads this and infers everything: space density, storage needs, activity zones, multi-generational considerations.
Three — what vibe. But not last — first, or second at most. Show four images, not labels. Real photographs of Indian rooms, each with a distinct atmosphere. No words needed. Priya taps the one that makes her feel something. That tap tells you palette, density, material language, warmth level.
Four — budget. A slider, not a text field. Anchored to reality: show ₹1L, ₹2L, ₹3L, ₹5L as points on the slider. Priya moves it. One gesture.
That's it. Ninety seconds. Then generate.
The critical shift: everything else gets discovered through the design, not asked upfront. When the AI collaborator says "I've placed the mandir in the northeast corner — does that work for your family?" — that's a better Vastu question than any intake checkbox, because it's in context, it shows the consequence, and it feels like a conversation not a survey. When the design shows a study desk and Priya says "we don't need that, replace it with more storage" — that's a better must-haves discovery than any checkbox. The planner is the real intake. The four questions are just enough to start.
The mantra: ask only what the AI cannot infer, and ask everything else through the design.

The 3D Experience: This Is Your Product
This needs to be thought about completely differently from everything else in Nirmit. The intake is setup. The quotation is an artifact. The chat is a feature. The 3D experience — the reveal, the editing, the catalog, the live updates — this is the product. This is what Nirmit is. Everything else serves this.
Which means it cannot be good. It has to be extraordinary. And extraordinary means thinking carefully about what "extraordinary" means for Priya specifically.
The Reveal: A Single Perfect Room
The reveal cannot be a grid of options. This is counterintuitive — "more choice is better" feels like a product principle, but it's wrong here. When Priya sees three visions simultaneously, she enters evaluation mode. She starts comparing. Comparing is cognitive work. Cognitive work kills feeling. And feeling is what produces the WhatsApp moment.
The reveal should show one room. Full screen. Nothing else visible.
The room should be shown from the entrance angle — the view from the doorway. This is the most emotionally resonant perspective because it's how people actually experience entering a home. It answers the question Priya is unconsciously asking: "What will this feel like to walk into?"
After five seconds of seeing it, she can swipe to see it from the sofa. Then from above. Three views of one room, not three rooms.
Below the room, in small type: "This is The Gathering — built for your family's evenings together." A single line of philosophy. Then: "See another direction →"
She swipes to see The Breath. She swipes again for The Keeper. But each one fills the screen completely, one at a time. She's not comparing — she's feeling each one separately. The one she lingers on longest is the one she wants. The one she sends to Rohan on WhatsApp.
The 3D Itself: What Makes It Extraordinary
The difference between a 3D room viewer that's impressive and one that's transcendent is almost never the technical sophistication. It's almost always three things: lighting, material texture, and human scale.
Lighting is everything. The same room with flat lighting looks like a furniture catalog. With warm directional light — simulating the quality of a Mumbai afternoon through an east-facing window — it looks like a home. Every piece of furniture, every surface, every shadow should be lit as if someone actually lives there. This means real-time global illumination or at minimum pre-baked ambient occlusion with directional light simulation. The light should change subtly with the room orientation. Northeast-facing rooms should feel different from southwest-facing rooms.
Material texture is what makes furniture feel real. A sofa isn't a grey rectangle — it's a specific fabric with a specific weave that catches light differently at different angles. A teak TV unit has grain that runs a certain direction. Marble-finish laminate has veining. These aren't decorative details — they're the things that make Priya say "this looks like what I actually want" rather than "this looks like a design tool." Every material in the catalog needs at minimum a base texture, a roughness map, and correct reflectance. This is asset work, not engineering work, but it's essential.
Human scale is what makes the room feel livable rather than architectural. Put a plant in the corner. A cup of chai on the coffee table. A TV remote on the sofa. A children's book on the floor near the couch. These aren't permanent objects — they're atmosphere elements that make the room feel inhabited rather than staged. When Priya sees a room that looks like it could already be hers, the emotional connection is immediate. This is the difference between seeing a room and seeing her room.
The Editing: Feel Like a Designer, Not an Operator
The editing experience is where most 3D design tools collapse into complexity. The temptation is to give Priya all the controls — rotate this item, nudge it by 10cm, swap the material from option A to option B. This makes the product feel capable but it makes Priya feel incompetent.
The editing should work at the level of intent, not the level of manipulation.
Priya taps the sofa. Instead of seeing resize handles and a rotation dial, she sees four things: "Make it bigger," "Change the fabric," "Try a different style," "Remove it." These are intents. She picks "Change the fabric." The room shows her five fabric swatches applied to her actual sofa in real-time — not a swatch card, but the actual sofa in the actual room with the actual lighting, with each fabric. She taps the one she likes. Done.
She never moves a slider. She never types a dimension. She never opens a properties panel.
The only exception to intent-based editing: drag to move. Dragging furniture is intuitive enough and satisfying enough that it should remain. But dragging should snap to valid positions — the solver runs in real-time as she drags, preventing overlap, maintaining walkway space, enforcing Vastu zones if requested. She can't put the sofa in front of the door. It won't let her. The room remains valid as she explores.
The Catalog: Alive, Not Listed
The catalog should never appear as a list or a grid. A catalog grid turns Priya into a shopper browsing SKUs. That's not the experience.
The catalog should enter the experience in three ways only:
First: as AI suggestions. The collaborator says "I'd suggest switching to this fabric for the sofa — it's ₹3,000 more but it holds up better with kids." Priya sees the suggestion appear as a card showing the specific sofa with the specific fabric in the specific room. One tap to apply. This is the catalog at its best — curated, contextual, explained.
Second: as alternatives when Priya taps something. She taps the TV unit. She sees "Try another style" — which shows her three alternative TV units that fit the same space, the same aesthetic, and her budget. Not the entire catalog — three curated alternatives. She picks one, it swaps instantly.
Third: as search when she knows what she wants. "Find me a rocking chair" — the catalog responds with options that fit the room. Still filtered, still curated, never the full catalog.
The catalog is never browsed. It's discovered. The product decides what to show her and when. This is a design decision, not a technical one, and it's the difference between Nirmit feeling like a service and feeling like a furniture website.
Live Cost: A Companion, Not a Meter
As Priya edits, the cost should update in real-time. But the display of cost is a product decision that most teams underestimate.
A running total feels like a cash register. Every time it goes up, Priya feels a small anxiety. Every time she adds something nice, she sees the number climb and feels guilty. This is the wrong feeling.
Show the cost as a budget story, not a total. "₹2,47,000 — within your budget, ₹53,000 remaining." When something goes up: the bar gets a little fuller, the remaining number goes down, and the change is shown as "+₹3,000 for the sofa upgrade." She can see the tradeoff. She made it consciously.
When she goes over budget: don't turn the number red. That's a shout. Instead, the AI collaborator says: "You're ₹12,000 over. I can fix that by switching the coffee table to a carpenter build — same look, saves ₹15,000. Want me to?" The AI catches the overage before Priya feels bad about it, and offers a solution in the same breath. The cost never feels like a wall. It feels like a parameter the AI is helping her optimize.

The Flow: Every Transition Is a Feeling
The overall flow will feel amazing if you treat every transition between states as a deliberate emotional beat, not a navigation event.
The moment after the four intake questions — the four-question intake ends and Nirmit says "Let me design your room." This is not a loading screen. This is a moment of anticipation. Show the room being understood — a brief animation that shows the room dimensions being drawn, the family silhouette being placed, the style being applied. Not a spinner. A narrative. "Understanding your space… placing your family… finding your vibe…" This takes ten seconds and it makes those ten seconds feel like something is being made for Priya, not processed.
The moment of reveal — the design appears. This should have ceremony. A pause. A slow fade from the generating animation into the full-screen room. Silence for two seconds before any UI elements appear. Let her just see it. Then the UI fades in gently: the room name, the philosophy line, the navigation.
The moment she taps something to edit — the room should respond immediately. Not after a loading delay. The tap should produce instant visual feedback — a highlight, a gentle pulse — and then the intent options appear. If the actual swap takes a moment to render, show a shimmer on the selected item while it loads. Never show a spinner in the middle of the room.
The moment the cost changes — subtle animation on the cost display. The number rolls to the new value. The bar animates smoothly. If it's a savings, a brief green accent. If it's an addition, no alarm — just an update. The room continues to be visible throughout. Cost is peripheral. The room is primary.
The moment she finishes — the transition from planner to export should feel like completion, not navigation. "Your design is ready." Not "Proceed to export." The quotation appears with the same reveal ceremony as the original design — a moment of arrival, not a form.

The AI Collaborator: What Robustness Actually Means
Robustness in an AI collaborator is not about handling edge cases. It's about being reliably, consistently, convincingly good — so that Priya trusts it enough to use it for the important decisions, not just the simple ones.
Most AI chat features fail at robustness not because they can't handle the input, but because they produce responses that feel generic, corporate, or uncertain. "I can help you with that. Would you like me to suggest some options?" is technically a response. It is not a collaborator. It's a call center script.
Robustness means the collaborator always does four things, on every single response, without exception:
It takes a position. "I think the dark leather sofa is wrong for this room. It'll dominate the space and with a four-year-old, light fabric is more forgiving." Not "here are some sofa options." A position. An opinion. Backed by a reason.
It knows the room. Every response should demonstrate that the AI has read the specific room it's working with. "You currently have the sofa at 2.4 meters — going larger would push it to within 60cm of the opposite wall, which will feel cramped." Not generic advice. Specific knowledge of this room, this placement, this tradeoff.
It knows the person. The collaborator should carry the intake context throughout the entire session. "You mentioned Vastu matters to your mother-in-law — I've kept the northeast corner clear for exactly this reason." "You have a four-year-old, so I'm keeping the center of the room open rather than filling it with a coffee table." These references should appear naturally, not as a performance of remembering. They should inform decisions without being announced.
It offers a path forward. Every response ends with either a confirmation request or a next step. "Shall I make that change?" or "Want me to try the darker palette throughout?" or "I've made the swap — how does this feel now?" The conversation always has a next move. Priya never has to figure out what to say next. The collaborator keeps the conversation going.
The hardest part of collaborator robustness is handling the vague requests — and this is where most implementations fail. "Make it feel warmer." "Something's not right but I can't say what." "It doesn't feel like us." These are the most important things Priya will say, because they're what she actually feels. A robust collaborator handles them by doing three things: making a specific interpretation, acting on it, and showing the result. "When you say warmer — I'm reading that as: richer wood tones, warmer lighting, and a jute rug to bring in some texture. Let me try that." Then it does it. If it was wrong, she'll say so, and the next iteration is better. The collaborator never asks Priya to clarify what she meant by "warmer." It makes a choice. It might be wrong. That's fine — the correction is still a conversation, still a collaboration, still better than a blank field waiting for more specific input.
The second hardest part: robustness under constraint. When Priya is over budget, when the room is too small for what she wants, when two requirements conflict — the collaborator must handle the tension honestly, with a specific proposed resolution, rather than either ignoring the problem or throwing up its hands. "You've asked for both a full sofa set and a dining area, but at the room's dimensions, one of them will block the entrance. I'd suggest keeping the sofa and letting the dining function double as an occasional setup — a folding table that lives against the wall. Here's what that would look like." Honest about the constraint. Creative about the resolution. Never just "that won't fit."
The collaborator needs a voice that is distinctly Indian without being performative. It doesn't need Hinglish words scattered in for effect. It needs to understand what Indian families actually care about: the first impression for guests, the grandmother's comfort, the prayer space's sanctity, the way the home feels during Diwali, the visibility of clutter. When the collaborator references these things naturally — not as checkbox items but as design considerations it genuinely weighs — Priya feels like she's talking to someone who grew up understanding these things. That feeling of cultural recognition is more powerful than any feature.

The Through-Line
All four of your points connect to one underlying principle: Nirmit should make Priya feel like a design expert, not feel like she's using a design tool.
The short intake makes her feel like Nirmit already understands enough to begin. The 3D reveal makes her feel like she has vision. The editing experience makes her feel like she has taste. The AI collaborator makes her feel like she's making the right decisions. The quotation makes her feel like she can actually do this.
At no point should she feel like she's operating software. At every point she should feel like she's discovering what her home could be, guided by someone who has done this a thousand times and is doing it just for her.
That's the through-line. Everything else is implementation


The Clean Version of Nirmit
Three distinct parts. Hard separation between them.
BACKEND (Python)          FRONTEND (React)         DOCUMENT
LangChain / LangGraph  ←→  UI/UX only            →  Quotation
                           No AI logic
                           No business logic
                           Just how it looks
                           and feels
The backend is a brain. The frontend is a face. They talk through a clean API. The frontend never does anything intelligent — it collects input, displays output, and handles interaction. Every intelligent decision — layout generation, Vastu compliance, furniture selection, AI collaboration, cost calculation — happens in the backend.

What Each Part Actually Does
The Backend — LangChain / LangGraph
This is where everything that currently lives scattered across layoutService.ts, chatEngine.ts, materialService.ts, scopeService.ts, costing.ts belongs. All of it. Move it out of the frontend entirely.
LangGraph specifically is right for this because Nirmit's AI work is not a single call — it's a workflow with distinct stages that depend on each other.
Intake JSON
    ↓
[Node 1: Room Interpreter]
Read dimensions, family, vibe, budget.
Build a structured design brief.
    ↓
[Node 2: Furniture Selector]
Query the catalogue with constraints.
Filter by room type, budget, dimensions, style.
Select candidate items.
    ↓
[Node 3: Layout Generator]
Run placement logic with Vastu rules.
Produce 3 distinct layout options.
Each with philosophy, placement coordinates,
reasoning, and cost.
    ↓
[Node 4: Ranker + Explainer]
Score each layout.
Generate the "why this was made for you" text.
Return structured JSON to frontend.
    ↓
[Live: Collaborator Agent]
Stateful conversation.
Full room context in every call.
Takes position, explains reasoning,
applies changes, tracks cost.
The catalogue lives in the backend. The Vastu rules live in the backend. The cost engine lives in the backend. The quotation generator lives in the backend. The frontend never sees any of this logic — it only sees the outputs.
The Frontend — UI/UX Only
React. No AI calls. No business logic. No solver. No costing functions. Just:

Collecting the intake (4 questions, beautifully presented)
Showing the room reveal (3 visions, full screen, warm renders)
The 2D/3D planner (immaculate, this is the main attraction)
The AI chat interface (sends text, displays responses, applies changes)
The cost display (reads from state, shows beautifully)
The export trigger (calls backend, downloads document)

Every screen is a UI problem, not a logic problem. The frontend's job is to make things feel beautiful and responsive. Nothing else.
The API Between Them
Five endpoints. That's all.
POST /generate          intake JSON → 3 layouts + renders + reasoning
POST /chat              message + room state → response + actions + cost delta  
POST /apply             action list → updated room state
POST /cost              room state → full cost breakdown
POST /export            room state + preferences → quotation PDF
The frontend posts to these endpoints and renders the responses. It holds the current room state in Zustand and keeps the display in sync. That's the entire job of the frontend.

Why LangGraph Specifically
LangGraph gives you stateful, conditional workflows — which is exactly what layout generation needs. The nodes above aren't just sequential API calls. They're conditional:
If the budget is under ₹1L, the furniture selector filters differently. If the household has elderly members, the layout generator applies accessibility constraints. If a layout can't fit the must-haves within budget, the ranker should say so and explain why rather than returning a bad layout silently.
LangGraph makes these conditions explicit and debuggable. You can see exactly which node ran, what it decided, and why. Right now that logic is buried in TypeScript files and silent failures are invisible.
The collaborator agent specifically benefits from LangGraph's persistence — it can hold the full conversation state, the room state, and the user's preference history across multiple turns without any of that logic living in the frontend.

The 2D/3D Planner — This Is Non-Negotiable
You said immaculate. Let's be precise about what that means.
The planner is the product. Everything else is setup for this moment or documentation of it. The experience of being in the room — seeing it, adjusting it, feeling it change as you talk to the AI — this is what Nirmit is. If this is mediocre, nothing else matters.
Immaculate means:
The 3D is warm. Not a game engine. Not a grey room with boxes. Warm directional light. Material textures that read correctly — fabric looks soft, wood shows grain, brass catches light. Shadows that suggest depth. A room that looks inhabited, not staged. This is primarily a lighting and material quality problem, not a modeling problem. You don't need ultra-high-poly furniture. You need correct materials and correct light.
The 2D is clean and readable. The floor plan should look like something an architect drew, not a debug view. Furniture labeled, dimensioned, oriented correctly. A north arrow. Wall thickness shown. The 2D and 3D are synchronized — a change in one updates the other immediately.
Interaction is intent-based, not technical. Tap a sofa. See "Make it bigger / Change fabric / Try different style / Remove." Not resize handles. Not a properties panel. Intents. The system executes the intent and shows the result. Drag to move is the only direct manipulation — because it's intuitive. Everything else goes through intent or the AI chat.
The finishing layer exists as its own mode. After furniture placement, a second mode: sunlight angle and warmth, wall colour, flooring, curtains. The 3D viewer is still the star but the controls shift from "what goes where" to "how does it look and feel." This is a mode switch within the planner, not a separate screen.