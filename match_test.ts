import {MatchMaker} from "./match.ts";
import {assertEquals} from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("enqueue", () => {
    let item1: string | undefined;
    let item2: string | undefined;

    const m = new MatchMaker<string>(false, (i1, i2) => {
        item1 = i1;
        item2 = i2;
    });

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    m.enqueue("1", "thing1");

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    m.enqueue("2", "thing2");

    assertEquals(item1, "thing1");
    assertEquals(item2, "thing2");

    m.enqueue("3", "thing3");

    assertEquals(item1, "thing1");
    assertEquals(item2, "thing2");
});

Deno.test("drop", () => {
    let item1: string | undefined;
    let item2: string | undefined;

    const m = new MatchMaker<string>(false, (i1, i2) => {
        item1 = i1;
        item2 = i2;
    });

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    m.enqueue("1", "thing1")

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    m.drop("1")

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    m.enqueue("2", "thing2")

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);
})