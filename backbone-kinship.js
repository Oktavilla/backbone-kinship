/*
* A simple model for 1-N and 1-1 relations.
* Relations are set up like
* relations: {
*   my-first-relation: MyCollection,
*   my-other-relation: MyModel
* }
* After that the related collection/model instances are available both directly on the
* model (Model.my-first-relation) and by using Model.get (Model.get("my-first-relation")).
* Note that relations are undefined until they have been assigned a value.
*/
define(["backbone", "underscore"], function(Backbone, _) {
  "use strict";

  Backbone.RelationalModel = Backbone.Model.extend({
    relations: {},

    get: function(key) {
      return this.relations[key] ? this[key] : Backbone.Model.prototype.get.call(this, key);
    },

    set: function(key, value, options) {
      var attributes,
          isCloned;
      // Handling the two function signatures, either key-value or attribute object
      if (_.isObject(key)) {
        attributes = key;
        options = value;
      } else {
        (attributes = {})[key] = value;
      }
      // Check if any relations are among the attributes
      _.each(this.relations, function(constructor, name) {
        if (typeof attributes[name] !== "undefined") {
          // Make sure that this relation is set up
          if (!this[name]) {
            // Setting up new relation
            this[name] = new constructor();
            // Setting up dispatcher for relational events, for example that "add" on a relation called "collection" would trigger the event "collection:add" on this model
            delegateEvents(this[name], this, name);
          }
          // Setting data on the relational object using either model.set() or collection.reset()
          this[name][(this[name] instanceof Backbone.Collection) ? "reset" : "set"](attributes[name], attributes[name].value, options);
          // Removing relational data so it isn't also set on the model
          if (key[name]) {
             // Cloning to avoid affecting other users of this object (but we don't want to clone it more than once because performace)
            if (!isCloned) {
              key = _.clone(key);
              isCloned = true;
            }
            delete key[name]; // Deleting from attribute object
          } else {
            key = null;
          }
        }
      }, this);
      if (key) {
        Backbone.Model.prototype.set.call(this, key, value, options);
      }
      return this;
    },

    toJSON: function(options) {
      var json = Backbone.Model.prototype.toJSON.call(this, options);
      // Adding expanded json data from all relations
      _.each(this.relations, function(constructor, name) {
        if (this[name]) {
          json[name] = this[name].toJSON();
        }
      }, this);
      return json;
    }
  });

  /*
  * Delegates all events from one entity to another, on the format
  * eventName:fromName
  * @param from The entity that emits the event
  * @param to The entity that should receive the event
  * @param fromName Display name to use to show where this event originated
  */
  function delegateEvents(from, to, fromName) {
    from.bind("all", function() {
      var args = _.toArray(arguments);
      args[0] = args[0] + ":" + fromName;
      to.trigger.apply(to, args);
    });
  };
});