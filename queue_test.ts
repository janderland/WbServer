import {Queue} from "./queue.ts";
import {assertEquals} from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("enqueue", () => {
    let item1: string | undefined;
    let item2: string | undefined;

    const q = new Queue<string>(false, (i1, i2) => {
        item1 = i1;
        item2 = i2;
    });

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    q.enqueue("thing1");

    assertEquals(item1, undefined);
    assertEquals(item2, undefined);

    q.enqueue("thing2");

    assertEquals(item1, "thing1");
    assertEquals(item2, "thing2");

    q.enqueue("thing3");

    assertEquals(item1, "thing1");
    assertEquals(item2, "thing2");
});
