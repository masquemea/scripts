// ==UserScript==
// @name            Upgrade phone tool
// @namespace       http://amazon.com
// @description     Upgrade phone tool - Choose what you want from "Display Options > Main and Org Chart tabs > Upgrade Phone Tool". Available options include "job level", "hire date", "tenure" and "work history" of employee; "job level", "hire date" and "tenure" of everyone in the org chart; also sorting of org chart by level and tenure.
// @include         https://phonetool.amazon.com/people/*
// @include         https://phonetool.amazon.com/users/*
// @require         http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js
// @grant           GM_xmlhttpRequest
// ==/UserScript==

// Closure
(function() {
  var EnhancedCookie = {
    set: function(name, value, days) {
      var expires = '';
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toGMTString();
      }
      document.cookie = name + '=' + value + expires + '; path=/';
    },

    get: function(name) {
      var retVal = null;
      var nameEQ = name + '=';
      var ca = document.cookie.split(';');
      for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          retVal = c.substring(nameEQ.length, c.length);
          break;
        }
      }
      return retVal;
    },

    erase: function(name) {
      EnhancedCookie.set(name, '', -1);
    }
  };

  var PTUpgrader = {
    urlPrefix: "https://phonetool.amazon.com/users/",
    urlPostfix: ".json",
    level: "LEVEL: ",
    hireDate: "HIRE DATE: ",
    tenure: "HERE FOR: ",
    loading: "LOADING...",
    empId: $(location).attr("pathname").match(/[people|users]\/(\w+)/)[1],
    currentDate: new Date(),
    months: {
      JAN: {ord: "01"},
      FEB: {ord: "02"},
      MAR: {ord: "03"},
      APR: {ord: "04"},
      MAY: {ord: "05"},
      JUN: {ord: "06"},
      JUL: {ord: "07"},
      AUG: {ord: "08"},
      SEP: {ord: "09"},
      OCT: {ord: "10"},
      NOV: {ord: "11"},
      DEC: {ord: "12"}
    },
    empOptions: [
      {label: "Show job level", id: "show_emp_level"},
      {label: "Show hire date", id: "show_emp_hire_date"},
      {label: "Show tenure", id: "show_emp_tenure"},
      {label: "Show work history", id: "show_emp_work_history"},
    ],
    orgOptions: [
      {label: "Show job level", id: "show_org_level"},
      {label: "Show hire date", id: "show_org_hire_date"},
      {label: "Show tenure", id: "show_org_tenure"},
      {label: "Sort by level and tenure", id: "org_sorting"},
    ],
    cookies: {},

    getDate: function(dateStr) {
      var retVal = PTUpgrader.currentDate; // default to today for new joinees who don't have a date yet
      if (dateStr !== null) {
        retVal = new Date(Date.parse(dateStr));
        if (retVal == "Invalid Date") {
          var dateParts = dateStr.split("-"),
          year = dateParts[2] < 80 ? ("20" + dateParts[2]) : ("19" + dateParts[2]), // TODO: Need a fix before 2080
          month = this.months[dateParts[1]];
          retVal = new Date(year + "-" + month.ord + "-" + dateParts[0]);
        }
      }
      return retVal;
    },

    getDateDiff: function(startDate, endDate) {
      var diffMs = endDate - startDate,
        diffSec = diffMs / 1000,
        diffMin = diffSec / 60,
        diffHrs = diffMin / 60,
        diffDays = Math.floor(diffHrs / 24),
        diffYears = Math.floor(diffDays / 365), // TODO: Need a fix for leap years
        diffMnths = Math.floor((diffDays - (diffYears * 365)) / 30), // TODO: Need a fix for non-30 days months
        diffText = "~";
      diffDays = diffDays - (diffYears * 365) - (diffMnths * 30);
      if (diffYears > 0) {
        diffText = diffYears + (diffYears === 1 ? " year " : " years ");
      }
      if (diffMnths > 0) {
        diffText += diffMnths + (diffMnths === 1 ? " month " : " months ");
      }
      if (diffDays > 0) {
        diffText += diffDays + (diffDays === 1 ? " day " : " days ");
      }
      return diffText;
    },

    displayEmpInfo: function() {
      if (PTUpgrader.cookies.show_emp_level) $(".dl-horizontal").append($("<dt>").text(PTUpgrader.level)).append($("<dd>", {id: "empLevel"}).text(PTUpgrader.loading));
      if (PTUpgrader.cookies.show_emp_hire_date) $(".dl-horizontal").append($("<dt>").text(PTUpgrader.hireDate)).append($("<dd>", {id: "empHireDate"}).text(PTUpgrader.loading));
      if (PTUpgrader.cookies.show_emp_tenure) $(".dl-horizontal").append($("<dt>").text(PTUpgrader.tenure)).append($("<dd>", {id: "empTenure"}).text(PTUpgrader.loading));
      $.ajax({
        url: PTUpgrader.urlPrefix + PTUpgrader.empId + PTUpgrader.urlPostfix,
        type: "GET",
        dataType: "json",
        success: function(data) {
          try {
            var hireDate = PTUpgrader.getDate(data.hire_date);
            if (PTUpgrader.cookies.show_emp_level) $("#empLevel").text(data.job_level);
            if (PTUpgrader.cookies.show_emp_hire_date) $("#empHireDate").text(hireDate.toDateString());
            if (PTUpgrader.cookies.show_emp_tenure) $("#empTenure").text(PTUpgrader.getDateDiff(hireDate, PTUpgrader.currentDate));
          } catch(e) {
            console.log(e);
          }
        }
      });
    },

    displayOrgInfo: function() {
      var promises = [];
      $("#org-chart > tbody > tr").each(function() {
        var row = $(this),
        empId = row.attr("id"),
        node = $("#org-chart #" + empId + " .direct-reports-number");
        if (PTUpgrader.cookies.show_org_level) node.append(" ").append($("<span style='font-weight:bold;'>").text(PTUpgrader.level)).append($("<span>",{id:"empLevel_" + empId}).text(PTUpgrader.loading));
        if (PTUpgrader.cookies.show_org_hire_date) node.append(" ").append($("<span style='font-weight:bold;'>").text(PTUpgrader.hireDate)).append($("<span>",{id:"empHireDate_" + empId}).text(PTUpgrader.loading));
        if (PTUpgrader.cookies.show_org_tenure) node.append(" ").append($("<span style='font-weight:bold;'>").text(PTUpgrader.tenure)).append($("<span>",{id:"empTenure_" + empId}).text(PTUpgrader.loading));
        var promise = $.ajax({
          url: PTUpgrader.urlPrefix + empId + PTUpgrader.urlPostfix,
          type: "GET",
          dataType: "json",
          success: function(data) {
            try {
              var hireDate = PTUpgrader.getDate(data.hire_date);
              if (PTUpgrader.cookies.show_org_level) $("#empLevel_" + data.login).text(data.job_level);
              if (PTUpgrader.cookies.show_org_hire_date) $("#empHireDate_" + data.login).text(hireDate.toDateString());
              if (PTUpgrader.cookies.show_org_tenure) $("#empTenure_" + data.login).text(PTUpgrader.getDateDiff(hireDate, PTUpgrader.currentDate));
              if (PTUpgrader.cookies.org_sorting) {
                row.data("empLevel", data.job_level);
                row.data("empTenure", PTUpgrader.currentDate - hireDate);
              }
            } catch(e) {
              console.log(e);
            }
          }
        });
        promises.push(promise);
      });
      return $.when.apply(undefined, promises).promise();
    },

    sortDirects: function() {
      if (!PTUpgrader.cookies.org_sorting) return;
      var $people = $("#org-chart > tbody > tr"),
      directsMargin = $people.last().find(".level").css("margin-left"),
      $directs = $people.filter(function() {
        return $(this).find(".level").css("margin-left") === directsMargin;
      }),
      lastIndex = $directs.length - 1;

      $directs.sort(function (a, b) {
        var scalar = 1000000000000,
        aRank = scalar * $(a).data("empLevel") + $(a).data("empTenure"),
        bRank = scalar * $(b).data("empLevel") + $(b).data("empTenure");
        return bRank - aRank;
      });

      $directs.each(function (i) {
        var className = $(this).find(".level").attr("class").match(/level\s(\w*)(\-bottom)?/)[1],
        isLast = i === lastIndex,
        newClass = "level " + className + (isLast ? "-bottom" : "");
        $(this).find(".level").attr("class", newClass);
      }).detach().appendTo("#org-chart > tbody");
    },

    displayWorkHistory: function() {
      GM_xmlhttpRequest({
        method: "GET",
        url: "http://jeetu.desktop.amazon.com/~jeetu/amazon-work-history/?uid=" + PTUpgrader.empId,
        onload: function(xhr) {
          try {
            var data = jQuery.parseJSON(xhr.responseText),
            historyData = data.response[PTUpgrader.empId],
            lastUpdated = data.properties.last_updated,
            html = "<div style='padding:20px 0 0 30px; font-family:Arial'>";
            html += "<p class='title'><i class='icon-lightbulb'></i>  Work History at Amazon</p><hr/>";
            html += "<div class='main-content' style='padding:10px'>";
            for (var i = 0; i < historyData.length; i++) {
              var position = historyData[i];
              html += "<div style='padding:5px 0; margin:0; border-bottom:1px solid #eee'>";
              html += "<h4 style='font-size:1.2em; font-weight:bold; color:#444; margin:0'>" + position.business_title + "</h4>";
              html += "<span style='color:#aaa; font-size:0.8em'>";
              if (position.job_title) {
                html+= "<b>" + position.job_title + "</b><br>";
              }
              if (position.dept_name) {
                html += position.dept_name + " | ";
              }
              if (position.manager_login) {
                html += " reporting to <a href='" ;
                html += PTUpgrader.urlPrefix + position.manager_login;
                html += "' style='color:#aaa'>";
                html += position.manager_name  + "</a> | ";
              }
              html += position.start_date + " - " + position.end_date;
              if (position.city) {
                html += " |  " + position.city;
              }
              html += "</span></div>";
            }
            html += "<div style='font-size:0.7em; text-align:right; color:#444'>Data last updated on " + lastUpdated + "</div>";
            html += "</div>";
            var d = document.createElement("div");
            d.className = "well content-well";
            d.innerHTML = html;
            document.getElementsByClassName("org-chart")[0].parentNode.appendChild(d);
          } catch(e) {
            console.log(e);
          }
        }
      });
    },

    loadConfig: function() {
      var isFirstLoad = EnhancedCookie.get("PTUpgraderV0") !== "true";
      if (isFirstLoad) EnhancedCookie.set("PTUpgraderV0", true);
      $(PTUpgrader.empOptions).each(function(index, option) {
        if (isFirstLoad) {
          EnhancedCookie.set(option.id, true);
          PTUpgrader.cookies[option.id] = true;
        } else {
          PTUpgrader.cookies[option.id] = EnhancedCookie.get(option.id) === "true";
        }
      });
      $(PTUpgrader.orgOptions).each(function(index, option) {
        if (isFirstLoad) {
          EnhancedCookie.set(option.id, true);
          PTUpgrader.cookies[option.id] = true;
        } else {
          PTUpgrader.cookies[option.id] = EnhancedCookie.get(option.id) === "true";
        }
      });
    },

    displayOptions: function() {
      var html = "<div class='modal-header title-header'>Upgrade Phone Tool</div><div class='row-fluid'><div class='span12'>";
      $(PTUpgrader.empOptions).each(function(index, option) {
        html += "<li class='checkbox boolean input optional'>";
        html += "<label class='' for='user_preference_profile_" + option.id + "_input'>";
        html += "<input id='user_preference_profile_" + option.id + "_input' name='user_preference_profile_" + option.id + "_input' type='checkbox'" + (PTUpgrader.cookies[option.id] ? ' checked' : '') + ">";
        html += option.label;
        html += "</input></label></li>";
      });
      html += "</div></div>";
      $("#tab-main").prepend(html);

      html = "<div class='modal-header title-header'>Upgrade Phone Tool</div><div class='row-fluid'><div class='span12'>";
      $(PTUpgrader.orgOptions).each(function(index, option) {
        html += "<li class='checkbox boolean input optional'>";
        html += "<label class='' for='user_preference_profile_" + option.id + "_input'>";
        html += "<input id='user_preference_profile_" + option.id + "_input' name='user_preference_profile_" + option.id + "_input' type='checkbox'" + (PTUpgrader.cookies[option.id] ? ' checked' : '') + ">";
        html += option.label;
        html += "</input></label></li>";
      });
      html += "</div></div>";
      $("#tab-org-tree").prepend(html);

      $("#user_preference_submit_action > button").click(function(e) {
        $(PTUpgrader.empOptions).each(function(index, option) {
          EnhancedCookie.set(option.id, $("#user_preference_profile_" + option.id + "_input").is(':checked'));
        });
        $(PTUpgrader.orgOptions).each(function(index, option) {
          EnhancedCookie.set(option.id, $("#user_preference_profile_" + option.id + "_input").is(':checked'));
        });
      });
    }
  };

  PTUpgrader.loadConfig();
  PTUpgrader.displayOptions();
  if (PTUpgrader.cookies.show_emp_level || PTUpgrader.cookies.show_emp_hire_date || PTUpgrader.cookies.show_emp_tenure) PTUpgrader.displayEmpInfo();
  if (PTUpgrader.cookies.show_emp_work_history) PTUpgrader.displayWorkHistory();
  if (PTUpgrader.cookies.show_org_level || PTUpgrader.cookies.show_org_hire_date || PTUpgrader.cookies.show_org_tenure || PTUpgrader.cookies.org_sorting) {
    $("#org-chart").bind("DOMNodeInserted", function(event) {
      if (event && event !== undefined &&
      event.target && event.target !== undefined &&
      event.target.nodeName && event.target.nodeName !== undefined &&
      event.target.nodeName.toLowerCase() == "tr" &&
      $(event.target).find(".level").attr("class").indexOf("-bottom") > 0) {
        $("#org-chart").unbind("DOMNodeInserted");
        PTUpgrader.displayOrgInfo().done(PTUpgrader.sortDirects);
      }
    });
  }
})();
